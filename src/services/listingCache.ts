import { cacheData } from "./cacheData";
import { cacheChanged } from "./fileCache";
import { ProviderError } from "../providers/types";

export interface CachedListing<T> {
  scope: string;
  ref: string;
  entries: T[];
  fetchedAt: number;
  etag?: string;
}

export async function listCached<T>(
  scope: string,
  ref: string,
  load: (etag?: string) => Promise<{ entries?: T[]; etag?: string }>,
  options: {
    force?: boolean;
    signal?: AbortSignal;
    onUpdate?: (entries: T[]) => void;
  } = {},
): Promise<T[]> {
  const key = JSON.stringify([scope, ref]);
  const stored = await cacheData
    .get<CachedListing<T>>("listings", key)
    .catch(() => undefined);
  options.signal?.throwIfAborted();
  if (!navigator.onLine) {
    if (stored) return stored.entries;
    throw new ProviderError("OFFLINE");
  }
  if (stored && !options.force && Date.now() - stored.fetchedAt < 60_000)
    return stored.entries;

  const refresh = async () => {
    const response = await load(stored?.etag);
    options.signal?.throwIfAborted();
    const entries = response.entries ?? stored?.entries ?? [];
    await cacheData
      .put("listings", key, {
        scope,
        ref,
        entries,
        fetchedAt: Date.now(),
        etag: response.entries ? response.etag : stored?.etag,
      })
      .then(cacheChanged, () => {});
    return entries;
  };
  if (stored && !options.force && options.onUpdate) {
    const update = options.onUpdate;
    void refresh().then(
      (entries) => {
        if (!options.signal?.aborted) update(entries);
      },
      () => {},
    );
    return stored.entries;
  }
  try {
    return await refresh();
  } catch (error) {
    options.signal?.throwIfAborted();
    if (
      stored &&
      error instanceof ProviderError &&
      ["OFFLINE", "RATE_LIMITED"].includes(error.code)
    )
      return stored.entries;
    throw error;
  }
}
