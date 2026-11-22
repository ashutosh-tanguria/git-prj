import { nameMatches, searchKey } from "./paletteQuery";
import { cacheData } from "./cacheData";
import { cachedFiles } from "./fileCache";
import type { CachedListing } from "./listingCache";

interface ListedEntry {
  ref: string;
  name: string;
  path?: string;
  kind: "file" | "dir" | "special";
}
export interface NamedEntry extends ListedEntry {
  scope: string;
  path: string;
  lastUsed?: number;
}

export function buildNames(
  listings: CachedListing<ListedEntry>[],
  recent: NamedEntry[],
  scopes: string[],
) {
  const byRef = new Map<string, NamedEntry>();
  const key = (scope: string, ref: string) => JSON.stringify([scope, ref]);
  for (const listing of listings) {
    if (!scopes.includes(listing.scope)) continue;
    for (const item of listing.entries) {
      if (item.kind === "special") continue;
      byRef.set(key(listing.scope, item.ref), {
        ...item,
        scope: listing.scope,
        path: item.path ?? item.name,
      });
    }
  }
  for (const item of recent) {
    if (scopes.includes(item.scope)) byRef.set(key(item.scope, item.ref), item);
  }
  return [...byRef.values()];
}

export async function loadNames(scopes: string[]) {
  const [folders, files] = await Promise.all([
    cacheData.all<CachedListing<ListedEntry>>("listings"),
    cachedFiles(),
  ]);
  return buildNames(
    folders,
    files.map((file) => ({ ...file, kind: "file" })),
    scopes,
  );
}

export function findNames(
  entries: NamedEntry[],
  query: string,
  kind: "file" | "dir",
) {
  const normalized = searchKey(query);
  return entries
    .filter((item) => item.kind === kind && nameMatches(item.name, normalized))
    .sort(
      (a, b) =>
        Number(searchKey(b.name).startsWith(normalized)) -
          Number(searchKey(a.name).startsWith(normalized)) ||
        (b.lastUsed ?? 0) - (a.lastUsed ?? 0) ||
        a.name.localeCompare(b.name),
    );
}
