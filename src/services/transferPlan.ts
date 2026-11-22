import { parseRef, refString } from "../lib/refs";
import {
  ProviderError,
  type Entry,
  type StorageProvider,
} from "../providers/types";
import { copyName } from "./folderOperations";
import { FolderCollision, type CollisionChoice } from "./folderTypes";
import { FOLDER_UPLOAD_CAP } from "./folderUpload";
import { folderPath } from "./destinations";
import { completeTree, repoRoot } from "./githubTree";
import { transferPending } from "./transferJournal";
import type { TransferRequest } from "./transferRequests";
import type {
  Transfer,
  TransferDraft,
  TransferEndpoint,
} from "./transferTypes";

const fold = (provider: StorageProvider, name: string) =>
  provider.id === "github" ? name : name.normalize("NFC").toLowerCase();
export async function planTransfers(
  request: TransferRequest,
  target: TransferEndpoint,
  provider: StorageProvider,
  rows: Transfer[],
  choice?: CollisionChoice,
) {
  const listing = await provider.list(target.ref).catch((error: unknown) => {
    if (
      provider.id === "github" &&
      error instanceof ProviderError &&
      error.code === "EMPTY_REPO"
    )
      return [];
    throw error;
  });
  if (
    request.collectionsExport &&
    request.items.length === 1 &&
    request.items[0].relativePath === ".shelf/collections.json"
  ) {
    const shelf = listing.find(
      (entry) => fold(provider, entry.name) === ".shelf",
    );
    if (shelf && shelf.kind !== "dir") throw Error("transferFolderCollision");
    if (shelf)
      return planTransfers(
        {
          ...request,
          collectionsExport: false,
          items: request.items.map(({ source, bytes }) => ({ source, bytes })),
        },
        { ...target, ref: shelf.ref },
        provider,
        rows,
        choice,
      );
  }
  const names = new Map<string, Entry>(
    listing.map((entry) => [fold(provider, entry.name), entry]),
  );
  const reserved = new Set(
    rows
      .filter(
        (row) =>
          transferPending(row) &&
          row.target.locationId === target.locationId &&
          row.target.ref === target.ref,
      )
      .map((row) => fold(provider, row.folders?.[0] ?? row.name)),
  );
  if (request.items.some((item) => item.relativePath)) {
    const base = request.items[0].relativePath?.split("/")[0];
    if (!base || request.move || request.items.length > FOLDER_UPLOAD_CAP)
      throw Error("localImportInvalid");
    const taken = (name: string) =>
      names.has(fold(provider, name)) || reserved.has(fold(provider, name));
    let root = base;
    if (taken(root)) {
      if (!choice) throw new FolderCollision([root]);
      if (choice === "replace") throw Error("transferFolderCollision");
      let index = 1;
      do root = copyName(base, index++, true);
      while (taken(root));
    }
    return request.items.map(({ source, bytes, relativePath }) => {
      const path = folderPath(relativePath ?? "").split("/");
      const name = path.pop()!;
      if (
        name !== source.entry.name ||
        path.shift() !== base ||
        !("local" in source) ||
        !bytes
      )
        throw Error("localImportInvalid");
      const folders = [root, ...path];
      if (target.provider === "github") {
        const git = parseRef(target.ref);
        return {
          bytes,
          draft: {
            source,
            name,
            move: false,
            allowMissingParent: true,
            target: {
              ...target,
              ref: refString({
                ...git,
                path: [git.path, ...folders].filter(Boolean).join("/"),
              }),
            },
          },
        };
      }
      return { bytes, draft: { source, target, name, move: false, folders } };
    });
  }
  const collisions: string[] = [];
  const result: { draft: TransferDraft; bytes?: Blob }[] = [];
  for (const { source, bytes } of request.items) {
    let name = source.entry.name;
    const directory = "endpoint" in source && source.entry.kind === "dir";
    const key = (value: string) => fold(provider, value);
    const taken = (value: string) =>
      names.has(key(value)) || reserved.has(key(value));
    if (taken(name) && !choice) {
      collisions.push(name);
      continue;
    }
    if (taken(name) && choice === "both") {
      let index = 1;
      do name = copyName(source.entry.name, index++, directory);
      while (taken(name));
    }
    const replace = names.get(key(name));
    if (
      reserved.has(key(name)) ||
      (replace && (directory || replace.kind !== "file"))
    )
      throw Error("transferFolderCollision");
    reserved.add(key(name));
    if (!directory) {
      result.push({
        draft: { source, target, name, move: request.move, replace },
        bytes,
      });
      continue;
    }
    if (
      !("endpoint" in source) ||
      source.endpoint.provider !== "github" ||
      target.provider !== "github" ||
      !source.entry.version
    )
      throw Error("transferUnsupportedSource");
    const from = parseRef(source.entry.ref);
    const to = parseRef(target.ref);
    const root = [to.path, name].filter(Boolean).join("/");
    if (
      from.owner === to.owner &&
      from.repo === to.repo &&
      from.branch === to.branch &&
      (root === from.path || root.startsWith(from.path + "/"))
    )
      throw Error("folderIntoSelf");
    const { tree } = await completeTree(repoRoot(from), source.entry.version);
    if (
      tree.some((item) => !["100644", "100755", "040000"].includes(item.mode))
    )
      throw Error("folderSpecial");
    const files = tree.filter((item) => item.mode !== "040000");
    if (files.length > FOLDER_UPLOAD_CAP) throw Error("transferFolderLimit");
    if (!files.length) throw Error("transferUnsupportedSource");
    for (const item of files) {
      const basename = item.path.split("/").at(-1)!;
      const folder = [root, ...item.path.split("/").slice(0, -1)].join("/");
      const ref = refString({ ...from, path: from.path + "/" + item.path });
      result.push({
        draft: {
          target: { ...target, ref: refString({ ...to, path: folder }) },
          source: {
            endpoint: { ...source.endpoint, ref },
            entry: {
              ref,
              name: basename,
              kind: "file",
              size: item.size ?? null,
              modified: null,
              version: item.sha,
              hash: item.sha,
            },
          },
          name: basename,
          move: request.move,
          allowMissingParent: true,
        },
      });
    }
  }
  if (collisions.length) throw new FolderCollision(collisions);
  return result;
}
