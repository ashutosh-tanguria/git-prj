import { cacheData } from "./cacheData";
import { cachedFiles } from "./fileCache";
import { githubTransferSource } from "./transferRequests";
import type { CachedListing } from "./listingCache";
import type { Entry as GitEntry } from "./library";
import type { Entry, Location } from "../providers/types";
import { itemKey, type LibraryItem } from "./organizer";
import { cloudScope } from "./cloudCache";
import { gitScope } from "./githubCache";
import { streamReference } from "./referenceRead";
import { transferSha256Stream } from "./transferHashClient";
import type { ResolveProvider } from "./transferTypes";

export type DuplicateGroup = { digest: string; items: LibraryItem[] };
export async function duplicateCandidates(
  account: string,
  roots: Location[],
  listed: LibraryItem[],
) {
  const [folders, cached] = await Promise.all([
    cacheData.all<CachedListing<Entry | GitEntry>>("listings"),
    cachedFiles(),
  ]);
  const sources = new Map<string, LibraryItem>();
  const clouds = new Map(roots.map((root) => [cloudScope(root), root]));
  const add = (scope: string, entry: Entry | GitEntry, size?: number) => {
    if (entry.kind !== "file") return;
    if (account && scope === gitScope(account)) {
      const row =
        "sha" in entry
          ? entry
          : {
              ...entry,
              path: "",
              size: size ?? entry.size ?? 0,
              sha: entry.version ?? "",
            };
      const item = githubTransferSource(account, row);
      sources.set(itemKey(item), item);
    } else {
      const root = clouds.get(scope);
      if (
        !root ||
        root.provider === "github" ||
        root.provider === "local" ||
        "sha" in entry
      )
        return;
      const item: LibraryItem = {
        entry,
        endpoint: {
          provider: root.provider,
          locationId: root.id,
          ref: entry.ref,
        },
      };
      sources.set(itemKey(item), item);
    }
  };
  for (const file of cached)
    add(
      file.scope,
      {
        ref: file.ref,
        name: file.name,
        size: file.size,
        version: file.version,
        kind: "file",
        modified: null,
        hash: null,
      },
      file.size,
    );
  for (const folder of folders.sort((a, b) => a.fetchedAt - b.fetchedAt))
    for (const entry of folder.entries) add(folder.scope, entry);
  for (const item of listed)
    if (item.entry.kind === "file") sources.set(itemKey(item), item);
  return [...sources.values()];
}
export function duplicateDeleteSelection(groups: DuplicateGroup[]) {
  return new Set(
    groups.flatMap(({ items }) =>
      items
        .filter((item) => item.entry.version)
        .slice(1)
        .map(itemKey),
    ),
  );
}
export async function scanDuplicates(
  items: LibraryItem[],
  hash: (item: LibraryItem) => Promise<string>,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
) {
  const sizes = new Map<number, LibraryItem[]>();
  let skipped = 0;
  for (const item of items) {
    const size = item.entry.size;
    if (size == null) {
      skipped++;
      continue;
    }
    const peers = sizes.get(size);
    if (peers) peers.push(item);
    else sizes.set(size, [item]);
  }
  const matches = new Map<string, LibraryItem[]>();
  const possible = [...sizes.values()]
    .filter((items) => items.length > 1)
    .flat();
  progress(0, possible.length);
  for (const [index, item] of possible.entries()) {
    signal.throwIfAborted();
    try {
      const digest = await hash(item);
      const peers = matches.get(digest);
      if (peers) peers.push(item);
      else matches.set(digest, [item]);
    } catch {
      signal.throwIfAborted();
      skipped++;
    }
    progress(index + 1, possible.length);
  }
  signal.throwIfAborted();
  return {
    skipped,
    groups: [...matches]
      .filter(([, rows]) => rows.length > 1)
      .map(([digest, items]) => ({ digest, items })),
  };
}
export async function hashReference(
  item: LibraryItem,
  resolve: ResolveProvider,
  signal: AbortSignal,
) {
  const task = new AbortController();
  const abort = AbortSignal.any([signal, task.signal]);
  try {
    return await transferSha256Stream(
      await streamReference(item, resolve, abort),
      abort,
    );
  } finally {
    task.abort();
  }
}
