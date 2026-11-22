import { createStaging, type Change, type WorkingStorage } from "./staging";
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("shelf-working-copy", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("meta");
      request.result.createObjectStore("bytes");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  }));
}
async function write(store: string, key: string, value: unknown) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
async function read<T>(store: string, key: string): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const req = database.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}
let persistenceRequested = false;
async function requestPersistence() {
  if (persistenceRequested) return;
  persistenceRequested = true;
  const granted =
    (await navigator.storage?.persist?.().catch(() => false)) ?? false;
  await write("meta", "persistence", granted);
}
const storage: WorkingStorage = {
  load: async () => (await read<Change[]>("meta", "current")) || [],
  save: async (rows) => {
    await write("meta", "current", rows);
    if (rows.length) await requestPersistence();
  },
  put: async (key, blob) => {
    if (navigator.storage?.getDirectory) {
      const directory = await navigator.storage.getDirectory(),
        handle = await directory.getDirectoryHandle("staged", { create: true }),
        file = await handle.getFileHandle(key, { create: true }),
        stream = await file.createWritable();
      await stream.write(blob);
      await stream.close();
    } else await write("bytes", key, blob);
  },
  get: async (key) => {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory(),
        dir = await root.getDirectoryHandle("staged"),
        file = await dir.getFileHandle(key);
      return file.getFile();
    }
    const blob = await read<Blob>("bytes", key);
    if (!blob) throw Error("workingMissing");
    return blob;
  },
};
export const staging = createStaging(storage);

export const cloudStorage = {
  load: <T>() => read<T>("meta", "cloud"),
  save: (value: unknown) => write("meta", "cloud", value),
  put: storage.put,
  get: storage.get,
  remove: async (key: string) => {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("staged");
      await dir.removeEntry(key);
      return;
    }
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("bytes", "readwrite");
      tx.objectStore("bytes").delete(key);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  },
};

export const transferStorage = {
  load: <T>() => read<T>("meta", "transfers"),
  save: (value: unknown) => write("meta", "transfers", value),
  get: storage.get,
  put: storage.put,
  remove: cloudStorage.remove,
  requestPersistence,
  async spool(
    key: string,
    response: Response,
    expected: number,
    progress: (bytes: number) => void,
    signal?: AbortSignal,
  ): Promise<Blob> {
    if (!response.body) throw Error("transferReadFailed");
    let total = 0;
    const body = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          total += chunk.length;
          if (total > expected) throw Error("transferSourceChanged");
          progress(total);
          controller.enqueue(chunk);
        },
        flush() {
          if (total !== expected) throw Error("transferSourceChanged");
        },
      }),
    );
    const type =
      response.headers.get("Content-Type") ?? "application/octet-stream";
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("staged", { create: true });
      const file = await dir.getFileHandle(key, { create: true });
      await body.pipeTo(await file.createWritable(), { signal });
      return new Blob([await file.getFile()], { type });
    }
    if (expected > 5 * 1024 * 1024) {
      await body.cancel();
      throw Error("transferStorageUnavailable");
    }
    const parts: BlobPart[] = [];
    const reader = body.getReader();
    try {
      for (;;) {
        signal?.throwIfAborted();
        const item = await reader.read();
        if (item.done) break;
        parts.push(new Uint8Array(item.value));
      }
    } finally {
      await reader.cancel();
    }
    const blob = new Blob(parts, { type });
    await storage.put(key, blob);
    return blob;
  },
};
