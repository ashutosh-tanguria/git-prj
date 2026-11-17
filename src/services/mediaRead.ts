import { list, request, ProviderError } from "../providers/github/client";
import "../i18n/preview";
import { refString, type GitRef } from "../lib/refs";
import { repoRoot } from "./githubTree";
import { getMedia, mediaCacheKey, putMedia } from "./mediaCache";
export interface MediaProgress {
  loaded: number;
  total: number;
  cached?: boolean;
  cacheUnavailable?: boolean;
}
export const MEDIA_CAP = 100 * 1024 * 1024;
export async function readMedia(
  ref: GitRef,
  signal?: AbortSignal,
  progress?: (value: MediaProgress) => void,
) {
  const files = await list(
    { ...ref, path: ref.path.split("/").slice(0, -1).join("/") },
    signal,
  );
  const entry = files.find(
    (file) => file.path === ref.path && file.kind === "file",
  );
  if (!entry) throw new ProviderError("NOT_FOUND");
  if (entry.size > MEDIA_CAP) throw new ProviderError("mediaLimit");
  progress?.({ loaded: 0, total: entry.size });
  const key = await mediaCacheKey(refString(ref), entry.sha);
  const cached = await getMedia(key);
  signal?.throwIfAborted();
  if (cached) {
    progress?.({ loaded: cached.size, total: cached.size, cached: true });
    return cached;
  }
  const response = await request(
    repoRoot(ref) + "/git/blobs/" + encodeURIComponent(entry.sha),
    signal,
    true,
  );
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError("readError");
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      if (loaded > MEDIA_CAP || loaded > entry.size) {
        await reader.cancel();
        throw new ProviderError("mediaLimit");
      }
      parts.push(new Uint8Array(value));
      progress?.({ loaded, total: entry.size });
    }
  } finally {
    reader.releaseLock();
  }
  if (loaded !== entry.size) throw new ProviderError("readError");
  signal?.throwIfAborted();
  const blob = new Blob(parts, {
    type: response.headers.get("Content-Type") || "application/octet-stream",
  });
  const saved = await putMedia(key, blob);
  signal?.throwIfAborted();
  progress?.({
    loaded,
    total: entry.size,
    cached: saved,
    cacheUnavailable: !saved,
  });
  return blob;
}
