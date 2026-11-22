import { getCachedFile, findCachedFile } from "./fileCache";
import type { LibraryItem } from "./organizer";
import type { ResolveProvider } from "./transferTypes";

export const referenceIdentity = ({ endpoint, entry }: LibraryItem) => ({
  scope:
    endpoint.provider === "github"
      ? "github:" +
        endpoint.locationId
          .slice(0, endpoint.locationId.indexOf(":"))
          .toLowerCase()
      : endpoint.provider + ":" + endpoint.locationId,
  ref: endpoint.ref,
  version: entry.version ?? undefined,
});
export function readReferenceCache(item: LibraryItem) {
  return getCachedFile(referenceIdentity(item), false);
}
export function referenceCacheRecord(item: LibraryItem) {
  return findCachedFile(referenceIdentity(item));
}
export async function readReference(
  item: LibraryItem,
  resolve: ResolveProvider,
  signal?: AbortSignal,
) {
  const cached =
    item.entry.version || !navigator.onLine
      ? await readReferenceCache(item)
      : undefined;
  signal?.throwIfAborted();
  if (cached) return cached;
  const provider = await resolve(item.endpoint);
  return provider.read(item.endpoint.ref, {
    signal,
    blobSha:
      item.endpoint.provider === "github" &&
      /^[a-f0-9]{40}$/i.test(item.entry.version ?? "")
        ? (item.entry.version ?? undefined)
        : undefined,
  });
}
