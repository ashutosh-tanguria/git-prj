import type { Entry, Location, StorageProvider } from "../providers/types";
import { ProviderError } from "../providers/types";
import { getCachedFile, pinCachedFile, storeCachedFile } from "./fileCache";
import { listCached } from "./listingCache";

export const cloudScope = (root: Location) => root.provider + ":" + root.id;

export function listCloud(
  root: Location,
  provider: StorageProvider,
  ref: string,
  options?: Parameters<typeof listCached<Entry>>[3],
) {
  return listCached(
    cloudScope(root),
    ref,
    async (etag) =>
      provider.listVersioned
        ? provider.listVersioned(ref, { signal: options?.signal, etag })
        : { entries: await provider.list(ref, { signal: options?.signal }) },
    options,
  );
}

export async function readCloud(
  root: Location,
  provider: StorageProvider,
  item: Entry,
  path: string,
  options: { pin?: boolean; version?: string; signal?: AbortSignal } = {},
) {
  if (options.version) return provider.read(item.ref, options);
  const ref = { scope: cloudScope(root), ref: item.ref };
  const cached = async () => {
    const blob = await getCachedFile(ref);
    if (!blob) throw new ProviderError("OFFLINE");
    if (options.pin) await pinCachedFile(ref, true);
    return blob;
  };
  if (!navigator.onLine) return cached();
  try {
    const current = await provider.stat(item.ref);
    const identity = {
      ...ref,
      name: current.name,
      path,
      version: current.version ?? "",
    };
    const hit = current.version && (await getCachedFile(identity));
    if (hit) {
      if (options.pin) await pinCachedFile(identity, true);
      return hit;
    }
    const bytes = await provider.read(item.ref, {
      signal: options.signal,
    });
    options.signal?.throwIfAborted();
    const latest = current.version
      ? await provider.stat(item.ref).catch(() => undefined)
      : undefined;
    options.signal?.throwIfAborted();
    const saved =
      latest?.version &&
      latest.version === current.version &&
      (await storeCachedFile(identity, bytes, options.pin));
    if (options.pin && !saved) throw new ProviderError("storageFull");
    return bytes;
  } catch (error) {
    if (
      error instanceof ProviderError &&
      ["OFFLINE", "RATE_LIMITED"].includes(error.code)
    )
      return cached();
    throw error;
  }
}
