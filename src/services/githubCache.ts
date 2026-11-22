import * as github from "../providers/github/client";
import { refString, type GitRef } from "../lib/refs";
import { cacheData } from "./cacheData";
import { listCached } from "./listingCache";
import { getCachedFile, pinCachedFile, storeCachedFile } from "./fileCache";
import type { MediaProgress } from "./mediaRead";

export const gitScope = (account: string) => "github:" + account.toLowerCase();
const folder = (ref: GitRef) => ({
  ...ref,
  path: ref.path.split("/").slice(0, -1).join("/"),
});
export const rememberGitHub = (account: string, roots: github.Repo[]) =>
  cacheData.put("settings", "github-library", { account, roots });
export const rememberedGitHub = () =>
  cacheData.get<{ account: string; roots: github.Repo[] }>(
    "settings",
    "github-library",
  );
export const forgetGitHub = () =>
  cacheData.remove("settings", "github-library");

export function listGitHub(
  account: string,
  ref: GitRef,
  options?: Parameters<typeof listCached<github.Entry>>[3],
) {
  return listCached(
    gitScope(account),
    refString(ref),
    (etag) => github.listVersioned(ref, options?.signal, etag),
    options,
  );
}

export async function readGitHub(
  account: string,
  ref: GitRef,
  signal?: AbortSignal,
  progress?: (value: MediaProgress) => void,
  pin = false,
) {
  const reference = { scope: gitScope(account), ref: refString(ref) };
  const fallback = async () => {
    const blob = await getCachedFile(reference);
    signal?.throwIfAborted();
    if (!blob) throw new github.ProviderError("OFFLINE");
    if (pin) await pinCachedFile(reference, true);
    progress?.({ loaded: blob.size, total: blob.size, cached: true });
    return blob;
  };
  if (!navigator.onLine) return fallback();
  let entry: github.Entry | undefined;
  try {
    entry = (
      await listGitHub(account, folder(ref), { signal, force: true })
    ).find((item) => item.ref === reference.ref && item.kind === "file");
  } catch (error) {
    signal?.throwIfAborted();
    if (
      error instanceof github.ProviderError &&
      ["OFFLINE", "RATE_LIMITED"].includes(error.code)
    )
      return fallback();
    if (
      !(error instanceof github.ProviderError) ||
      !["NOT_FOUND", "EMPTY_REPO", "TOO_LARGE"].includes(error.code)
    )
      throw error;
  }
  const media = /\.(mp4|webm|mp3|wav|ogg|m4a)$/i.test(ref.path);
  if (!entry) {
    if (pin) throw new github.ProviderError("NOT_FOUND");
    return media
      ? (await import("./mediaRead")).readMedia(ref, signal, progress)
      : github.read(ref, signal);
  }
  const identity = {
    ...reference,
    path: ref.path,
    name: entry.name,
    version: entry.sha,
  };
  const cached = await getCachedFile(identity);
  signal?.throwIfAborted();
  if (cached) {
    if (pin) await pinCachedFile(identity, true);
    if (media)
      progress?.({ loaded: cached.size, total: cached.size, cached: true });
    return cached;
  }
  const blob = media
    ? await (
        await import("./mediaRead")
      ).readMedia(ref, signal, progress, entry)
    : await (
        await (/^[0-9a-f]{40}$/i.test(entry.sha)
          ? github.openRead(ref, signal, entry.sha)
          : github.openRead(ref, signal))
      ).blob();
  signal?.throwIfAborted();
  const saved = await storeCachedFile(identity, blob, pin);
  if (media)
    progress?.({
      loaded: blob.size,
      total: blob.size,
      cached: saved,
      cacheUnavailable: !saved,
    });
  if (pin && !saved) throw Error("storageFull");
  return blob;
}
