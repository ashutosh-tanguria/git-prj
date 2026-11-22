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
const immutableGitBlob = (item: LibraryItem) =>
  item.endpoint.provider === "github" &&
  /^[a-f0-9]{40}$/i.test(item.entry.version ?? "")
    ? (item.entry.version ?? undefined)
    : undefined;
export async function streamReference(
  item: LibraryItem,
  resolve: ResolveProvider,
  signal: AbortSignal,
) {
  const cached =
    item.entry.version || !navigator.onLine
      ? await readReferenceCache(item)
      : undefined;
  signal.throwIfAborted();
  if (cached) return cached.stream();
  const provider = await resolve(item.endpoint);
  const check = async () => {
    if (
      item.entry.version &&
      (await provider.stat(item.endpoint.ref)).version !== item.entry.version
    )
      throw Error("transferSourceChanged");
    signal.throwIfAborted();
  };
  await check();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const pump = async () => {
    await provider.read(item.endpoint.ref, {
      signal,
      blobSha: immutableGitBlob(item),
      consume: async (response) => {
        if (!response.body) throw Error("transferReadFailed");
        await response.body.pipeTo(stream.writable, {
          signal,
          preventClose: true,
        });
        return new Blob();
      },
    });
    await check();
    await stream.writable.close();
  };
  void pump().catch((error: unknown) =>
    stream.writable.abort(error).catch(() => undefined),
  );
  return stream.readable;
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
    blobSha: immutableGitBlob(item),
  });
}
