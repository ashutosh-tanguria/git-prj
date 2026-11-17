const CAP = 500 * 1024 * 1024;
interface RecordMeta {
  key: string;
  size: number;
  used: number;
  opfs: boolean;
}
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("shelf-media-cache", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("meta", { keyPath: "key" });
      request.result.createObjectStore("bytes");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
async function transaction<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, mode),
      request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
async function directory() {
  return (await navigator.storage.getDirectory()).getDirectoryHandle(
    "media-cache",
    { create: true },
  );
}
export async function mediaCacheKey(ref: string, version: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(ref + "\n" + version),
      ),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function getMedia(key: string): Promise<Blob | undefined> {
  try {
    const meta = await transaction<RecordMeta | undefined>(
      "meta",
      "readonly",
      (store) => store.get(key),
    );
    if (!meta) return;
    const blob = meta.opfs
      ? await (await (await directory()).getFileHandle(key)).getFile()
      : await transaction<Blob>("bytes", "readonly", (store) => store.get(key));
    if (!blob || blob.size !== meta.size) return;
    await transaction("meta", "readwrite", (store) =>
      store.put({ ...meta, used: Date.now() }),
    );
    return blob;
  } catch {
    return undefined;
  } // Cache is disposable; playback falls back to the provider.
}
export async function putMedia(key: string, blob: Blob): Promise<boolean> {
  if (blob.size > CAP) return false;
  try {
    const records = await transaction<RecordMeta[]>(
      "meta",
      "readonly",
      (store) => store.getAll(),
    );
    let size = records
      .filter((row) => row.key !== key)
      .reduce((sum, row) => sum + row.size, blob.size);
    for (const row of records.sort((a, b) => a.used - b.used)) {
      if (size <= CAP) break;
      if (row.key === key) continue;
      if (row.opfs)
        await (await directory()).removeEntry(row.key).catch(() => {});
      else
        await transaction("bytes", "readwrite", (store) =>
          store.delete(row.key),
        );
      await transaction("meta", "readwrite", (store) => store.delete(row.key));
      size -= row.size;
    }
    const opfs = !!navigator.storage?.getDirectory;
    if (opfs) {
      const file = await (
          await directory()
        ).getFileHandle(key, { create: true }),
        stream = await file.createWritable();
      await stream.write(blob);
      await stream.close();
    } else
      await transaction("bytes", "readwrite", (store) => store.put(blob, key));
    await transaction("meta", "readwrite", (store) =>
      store.put({
        key,
        size: blob.size,
        used: Date.now(),
        opfs,
      } satisfies RecordMeta),
    );
    return true;
  } catch {
    return false;
  } // The UI explicitly reports an unavailable cache.
}
