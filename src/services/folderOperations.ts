import { FOLDER_UPLOAD_CAP } from "./folderUpload";
import { parseRef, type GitRef } from "../lib/refs";
import type { Entry } from "./library";
import { ProviderError } from "../providers/github/client";
import {
  completeTree,
  repositoryTree,
  repoRoot,
  type GitNode,
} from "./githubTree";
import { folderPath } from "./destinations";
import { evaluateFile } from "./guards";
import { staging } from "./workingStorage";
import {
  containsPath,
  sameLocation,
  FolderCollision,
  type CollisionChoice,
  type OperationPlan,
  type PlannedChange,
} from "./folderTypes";
export interface UploadItem {
  path: string;
  blob: Blob;
}
interface Input {
  entry?: Entry;
  source?: GitRef;
  target: GitRef;
  kind: "copy" | "rename" | "delete" | "upload";
  uploads?: UploadItem[];
}
const regular = (node: GitNode) => ["100644", "100755"].includes(node.mode);
export function copyName(path: string, index: number, folder: boolean) {
  const slash = path.lastIndexOf("/"),
    dot = folder ? -1 : path.lastIndexOf(".");
  const split = dot > slash + 1 ? dot : path.length;
  return (
    path.slice(0, split) +
    " (shelf copy" +
    (index > 1 ? " " + index : "") +
    ")" +
    path.slice(split)
  );
}
export async function planInputs(
  inputs: Input[],
  choice?: CollisionChoice,
): Promise<OperationPlan> {
  if (!inputs.length) throw new ProviderError("clipboardEmpty");
  const destination = inputs[0].target,
    remote = await repositoryTree(destination),
    pending = staging.snapshot();
  const byPath = new Map(remote.tree.map((n) => [n.path, n]));
  const changes: PlannedChange[] = [],
    replaceIds = new Set<string>(),
    collisions: string[] = [],
    reserved: string[] = [];
  let fallback = remote.fallback,
    caseWarning = false;
  const fold = (value: string) => value.normalize("NFC").toLowerCase();
  for (const input of inputs) {
    const { entry, source, kind } = input;
    let root = folderPath(input.target.path);
    if (!root) throw new ProviderError("destinationInvalid");
    caseWarning ||= remote.tree.some(
      (n) => n.path !== root && fold(n.path) === fold(root),
    );
    const folder = entry?.kind === "dir" || kind === "upload";
    const groupId = crypto.randomUUID();
    if (entry?.kind === "special") throw new ProviderError("folderSpecial");
    if (
      source &&
      (kind === "rename" || kind === "delete") &&
      pending.some(
        (c) =>
          sameLocation(c.target, source) &&
          (containsPath(source.path, c.target.path) ||
            (!!c.oldPath && containsPath(source.path, c.oldPath))),
      )
    )
      throw new ProviderError("folderPendingSource");
    const exists = (path: string) =>
      remote.tree.some(
        (n) =>
          containsPath(path, n.path) ||
          (n.mode !== "040000" && containsPath(n.path, path)),
      ) ||
      pending.some(
        (c) =>
          sameLocation(c.target, destination) &&
          (containsPath(path, c.target.path) ||
            containsPath(c.target.path, path)),
      ) ||
      reserved.some((p) => containsPath(p, path) || containsPath(path, p));
    const collision = kind !== "delete" && exists(root);
    if (collision && !choice) {
      collisions.push(root);
      continue;
    }
    if (collision && choice === "both") {
      let i = 1;
      const original = root;
      do {
        root = copyName(original, i++, folder);
      } while (exists(root));
    }
    if (
      source &&
      sameLocation(source, destination) &&
      kind !== "delete" &&
      (root === source.path ||
        (folder &&
          (containsPath(source.path, root) || containsPath(root, source.path))))
    )
      throw new ProviderError("folderIntoSelf");
    const replacing = collision && choice === "replace";
    if (
      replacing &&
      remote.tree.some(
        (n) =>
          n.mode !== "040000" && n.path !== root && containsPath(n.path, root),
      )
    )
      throw new ProviderError("folderParentFile");
    if (
      replacing &&
      reserved.some((p) => containsPath(p, root) || containsPath(root, p))
    )
      throw new ProviderError("folderDuplicate");
    reserved.push(root);
    if (
      replacing &&
      remote.tree.some(
        (n) => containsPath(root, n.path) && n.mode !== "040000" && !regular(n),
      )
    )
      throw new ProviderError("folderSpecial");
    const targetBase = byPath.get(root);
    let leaves: {
      path: string;
      sha?: string;
      size: number;
      mode: string;
      blob?: Blob;
      synthetic?: boolean;
    }[];
    if (kind === "upload")
      leaves = (input.uploads || []).map((u) => ({
        path: u.path,
        size: u.blob.size,
        mode: "100644",
        blob: u.blob,
      }));
    else if (entry?.kind === "dir" && source) {
      const tree = await completeTree(repoRoot(source), entry.sha);
      fallback ||= tree.fallback;
      if (tree.tree.some((n) => n.mode !== "040000" && !regular(n)))
        throw new ProviderError("folderSpecial");
      leaves = tree.tree
        .filter(regular)
        .map((n) => ({ ...n, size: n.size as number }));
      const empty = tree.tree.filter(
        (n) =>
          n.mode === "040000" &&
          !tree.tree.some((child) => child.path.startsWith(n.path + "/")),
      );
      if (!tree.tree.length)
        empty.push({ path: "", sha: entry.sha, mode: "040000" });
      for (const node of empty) {
        if (kind === "rename" || kind === "delete")
          changes.push({
            id: crypto.randomUUID(),
            target: {
              ...destination,
              path: [source.path, node.path].filter(Boolean).join("/"),
            },
            kind: "delete",
            baseVersion: node.sha,
            treeDelete: true,
            fileMode: "040000",
            size: 0,
            createdAt: Date.now(),
            verdict: evaluateFile(0),
            groupId,
            groupLabel: root,
            folderBase: { path: source.path, sha: entry.sha },
          });
        if (kind !== "delete")
          leaves.push({
            path: [node.path, ".gitkeep"].filter(Boolean).join("/"),
            size: 0,
            mode: "100644",
            blob: new Blob([]),
            synthetic: true,
          });
      }
    } else if (entry && source)
      leaves = [{ path: "", sha: entry.sha, size: entry.size, mode: "100644" }];
    else throw new ProviderError("folderIncomplete");
    if (!leaves.length && kind === "upload")
      leaves = [
        { path: ".gitkeep", size: 0, mode: "100644", blob: new Blob([]) },
      ];
    const incoming = new Set<string>(),
      folded = new Set<string>();
    for (const leaf of leaves) {
      if (kind !== "upload" && !leaf.synthetic && !leaf.sha)
        throw new ProviderError("folderIncomplete");
      if (!Number.isSafeInteger(leaf.size) || leaf.size < 0)
        throw new ProviderError("folderIncomplete");
      if (leaf.path) folderPath(leaf.path);
      const path =
        kind === "delete"
          ? [source?.path, leaf.path].filter(Boolean).join("/")
          : [root, leaf.path].filter(Boolean).join("/");
      if (incoming.has(path)) throw new ProviderError("folderDuplicate");
      incoming.add(path);
      if (folded.has(fold(path))) caseWarning = true;
      folded.add(fold(path));
      const original =
        source && [source.path, leaf.path].filter(Boolean).join("/");
      const existing = replacing ? byPath.get(path) : undefined;
      if (existing && existing.mode !== "040000" && !regular(existing))
        throw new ProviderError("folderSpecial");
      const reuse =
        source &&
        sameLocation(source, destination) &&
        kind === "copy" &&
        !!leaf.sha;
      changes.push({
        id: crypto.randomUUID(),
        target: { ...destination, path },
        kind:
          kind === "delete"
            ? "delete"
            : kind === "rename" && !leaf.synthetic
              ? "rename"
              : existing && regular(existing)
                ? "modify"
                : "add",
        oldPath: kind === "rename" && !leaf.synthetic ? original : undefined,
        baseVersion:
          (kind === "rename" && !leaf.synthetic) || kind === "delete"
            ? leaf.sha
            : existing?.sha,
        replaceVersion: existing?.sha,
        blobSha: reuse ? leaf.sha : undefined,
        fileMode: leaf.mode,
        size: kind === "rename" ? 0 : leaf.size,
        createdAt: Date.now(),
        verdict: evaluateFile(
          kind === "rename" || kind === "delete" ? 0 : leaf.size,
        ),
        groupId: folder ? groupId : undefined,
        groupLabel: folder ? root : undefined,
        folderBase:
          entry?.kind === "dir" && (kind === "rename" || kind === "delete")
            ? { path: source!.path, sha: entry.sha }
            : undefined,
        replaceTree:
          replacing && targetBase
            ? { path: root, sha: targetBase.sha }
            : undefined,
        blob: leaf.blob,
        readFrom:
          kind === "copy" && !reuse && source && leaf.sha
            ? { ref: source, sha: leaf.sha }
            : undefined,
      });
    }
    if (replacing) {
      for (const node of remote.tree.filter(
        (n) =>
          regular(n) &&
          containsPath(root, n.path) &&
          !incoming.has(n.path) &&
          ![...incoming].some((path) => containsPath(path, n.path)),
      ))
        changes.unshift({
          id: crypto.randomUUID(),
          target: { ...destination, path: node.path },
          kind: "delete",
          baseVersion: node.sha,
          size: node.size || 0,
          createdAt: Date.now(),
          verdict: evaluateFile(0),
          groupId,
          groupLabel: root,
          replaceTree: targetBase
            ? { path: root, sha: targetBase.sha }
            : undefined,
        });
      for (const row of pending)
        if (
          sameLocation(row.target, destination) &&
          containsPath(root, row.target.path)
        )
          replaceIds.add(row.id);
    }
  }
  if (collisions.length) throw new FolderCollision(collisions);
  return { changes, replaceIds: [...replaceIds], fallback, caseWarning };
}
export async function planEntries(
  entries: Entry[],
  destination: GitRef,
  cut: boolean,
  choice?: CollisionChoice,
  renameTo?: string,
  deleting = false,
) {
  const inputs: Input[] = [];
  const selected = entries.filter(
    (entry) =>
      !entries.some(
        (other) =>
          other !== entry &&
          other.kind === "dir" &&
          sameLocation(parseRef(other.ref), parseRef(entry.ref)) &&
          containsPath(other.path, entry.path),
      ),
  );
  for (const entry of selected) {
    const source = parseRef(entry.ref);
    if (cut && !sameLocation(source, destination))
      throw new ProviderError("clipboardCrossRepository");
    inputs.push({
      entry,
      source,
      target: {
        ...destination,
        path: deleting
          ? entry.path
          : [destination.path, renameTo || entry.name]
              .filter(Boolean)
              .join("/"),
      },
      kind: deleting ? "delete" : cut ? "rename" : "copy",
    });
  }
  return planInputs(inputs, choice);
}
export function planFolderUpload(
  destination: GitRef,
  items: UploadItem[],
  choice?: CollisionChoice,
) {
  if (items.length > FOLDER_UPLOAD_CAP)
    throw new ProviderError("folderUploadCap");
  const groups = new Map<string, UploadItem[]>();
  for (const item of items) {
    folderPath(item.path);
    const [root, ...rest] = item.path.split("/");
    if (!root || !rest.length) throw new ProviderError("destinationInvalid");
    groups.set(root, [
      ...(groups.get(root) || []),
      { ...item, path: rest.join("/") },
    ]);
  }
  return planInputs(
    [...groups].map(([root, uploads]) => ({
      target: {
        ...destination,
        path: [destination.path, root].filter(Boolean).join("/"),
      },
      kind: "upload",
      uploads,
    })),
    choice,
  );
}
