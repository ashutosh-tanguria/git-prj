import { cacheData } from "./cacheData";

export const MEGABYTE = 1_000_000;
export const DEFAULT_CACHE_CAP = 500 * MEGABYTE;
export interface CachedFile {
  scope: string;
  ref: string;
  path: string;
  name: string;
  version: string;
  bytesKey: string;
  size: number;
  lastUsed: number;
  pinned: boolean;
  opfs: boolean;
  type: string;
}
export type FileIdentity = Pick<
  CachedFile,
  "scope" | "ref" | "path" | "name" | "version"
>;
export const fileCacheKey = ({
  scope,
  ref,
}: Pick<FileIdentity, "scope" | "ref">) => JSON.stringify([scope, ref]);
export const cacheChanged = () =>
  window.dispatchEvent(new Event("shelf-cache-changed"));

export function evictionOrder<
  T extends Pick<CachedFile, "size" | "lastUsed" | "pinned">,
>(rows: T[], cap: number): T[] {
  let usage = rows.reduce((total, row) => total + row.size, 0);
  return rows
    .filter((row) => !row.pinned)
    .sort((a, b) => a.lastUsed - b.lastUsed)
    .filter((row) => {
      if (usage <= cap) return false;
      usage -= row.size;
      return true;
    });
}

let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(action: () => Promise<T>): Promise<T> {
  const task = queue.then(() =>
    navigator.locks
      ? navigator.locks.request("shelf-file-cache", action)
      : action(),
  );
  queue = task.catch(() => {});
  return task;
}

async function directory(create = false) {
  return (await navigator.storage.getDirectory()).getDirectoryHandle("files", {
    create,
  });
}

async function removeBytes(file: CachedFile) {
  if (file.opfs) {
    try {
      await (await directory()).removeEntry(file.bytesKey);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError"))
        throw error;
    }
  } else await cacheData.remove("bytes", file.bytesKey);
}

async function remove(file: CachedFile) {
  await removeBytes(file);
  await cacheData.remove("textindex", fileCacheKey(file));
  await cacheData.remove("indexmeta", fileCacheKey(file));
  await cacheData.remove("cachefiles", fileCacheKey(file));
}

export const cachedFiles = () => cacheData.all<CachedFile>("cachefiles");
export const cacheCap = async () =>
  (await cacheData.get<number>("settings", "cap")) ?? DEFAULT_CACHE_CAP;

export async function cacheUsage() {
  return (await cachedFiles()).reduce((total, file) => total + file.size, 0);
}

export function changeCacheCap(cap: number) {
  return exclusive(async () => {
    if (!Number.isSafeInteger(cap) || cap <= 0) throw Error("storageCap");
    await cacheData.put("settings", "cap", cap);
    for (const file of evictionOrder(await cachedFiles(), cap))
      await remove(file);
    cacheChanged();
  });
}

export function clearCache() {
  return exclusive(async () => {
    for (const file of await cachedFiles()) await remove(file);
    for (const store of [
      "bytes",
      "listings",
      "meta",
      "textindex",
      "indexmeta",
      "thumbnails",
    ])
      await cacheData.clear(store);
    if (typeof navigator.storage?.getDirectory === "function") {
      const dir = await navigator.storage.getDirectory();
      for (const name of ["files", "media-cache"]) {
        await dir
          .removeEntry(name, { recursive: true })
          .catch((error: DOMException) => {
            if (error.name !== "NotFoundError") throw error;
          });
      }
    }
    cacheChanged();
  });
}

export function findCachedFile(file: Pick<FileIdentity, "scope" | "ref">) {
  return cacheData.get<CachedFile>("cachefiles", fileCacheKey(file));
}

export function getCachedFile(
  file: Pick<FileIdentity, "scope" | "ref"> & { version?: string },
  touch = true,
) {
  return exclusive(async () => {
    const record = await findCachedFile(file);
    if (!record || (file.version && record.version !== file.version)) return;
    const blob = record.opfs
      ? await (
          await (await directory()).getFileHandle(record.bytesKey)
        ).getFile()
      : await cacheData.get<Blob>("bytes", record.bytesKey);
    if (!blob || blob.size !== record.size) {
      await remove(record);
      return;
    }
    if (touch)
      await cacheData.put("cachefiles", fileCacheKey(record), {
        ...record,
        lastUsed: Date.now(),
      });
    return record.opfs ? blob.slice(0, blob.size, record.type) : blob;
  }).catch(() => undefined);
}

export function storeCachedFile(file: FileIdentity, blob: Blob, pin = false) {
  return exclusive(async () => {
    const old = await findCachedFile(file);
    const pinned = pin || !!old?.pinned;
    const cap = await cacheCap();
    if (!pinned && blob.size > cap) {
      if (old && old.version !== file.version) await remove(old);
      return false;
    }
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        JSON.stringify([fileCacheKey(file), file.version]),
      ),
    );
    const bytesKey = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const next: CachedFile = {
      ...file,
      bytesKey,
      pinned,
      size: blob.size,
      type: blob.type,
      lastUsed: Date.now(),
      opfs: false,
    };
    const candidates = (await cachedFiles()).filter(
      (row) => fileCacheKey(row) !== fileCacheKey(file),
    );
    const evictions = evictionOrder([...candidates, next], cap);
    for (const row of evictions) if (row !== next) await remove(row);
    if (evictions.includes(next)) {
      if (old && old.version !== file.version) await remove(old);
      cacheChanged();
      return false;
    }
    if (typeof navigator.storage?.getDirectory === "function") {
      try {
        const handle = await (
          await directory(true)
        ).getFileHandle(bytesKey, { create: true });
        await blob.stream().pipeTo(await handle.createWritable());
        next.opfs = true;
      } catch {
        await directory()
          .then((dir) => dir.removeEntry(bytesKey))
          .catch(() => {});
      }
    }
    if (!next.opfs) await cacheData.put("bytes", bytesKey, blob);
    await cacheData.put("cachefiles", fileCacheKey(file), next);
    if (old && (old.bytesKey !== bytesKey || old.opfs !== next.opfs))
      await removeBytes(old);
    if (old && old.version !== next.version) {
      await cacheData.remove("textindex", fileCacheKey(file));
      await cacheData.remove("indexmeta", fileCacheKey(file));
    }
    cacheChanged();
    return true;
  }).catch(() => false);
}

export function pinCachedFile(
  file: Pick<FileIdentity, "scope" | "ref">,
  pinned: boolean,
) {
  return exclusive(async () => {
    const row = await findCachedFile(file);
    if (!row) return false;
    await cacheData.put("cachefiles", fileCacheKey(row), { ...row, pinned });
    if (!pinned) {
      for (const candidate of evictionOrder(
        await cachedFiles(),
        await cacheCap(),
      ))
        await remove(candidate);
    }
    cacheChanged();
    return true;
  });
}
