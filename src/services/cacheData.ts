export const cacheStores = [
  "cachefiles",
  "bytes",
  "listings",
  "meta",
  "textindex",
  "settings",
];
let database: Promise<IDBDatabase> | undefined;

function openCache() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("shelf-library", 1);
    request.onupgradeneeded = () => {
      for (const name of cacheStores) request.result.createObjectStore(name);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}

export async function cacheRequest<T>(
  store: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error);
  });
}

export const cacheData = {
  get: <T>(store: string, key: string) =>
    cacheRequest<T | undefined>(store, "readonly", (items) => items.get(key)),
  all: <T>(store: string) =>
    cacheRequest<T[]>(store, "readonly", (items) => items.getAll()),
  put: (store: string, key: string, value: unknown) =>
    cacheRequest(store, "readwrite", (items) => items.put(value, key)),
  remove: (store: string, key: string) =>
    cacheRequest(store, "readwrite", (items) => items.delete(key)),
  clear: (store: string) =>
    cacheRequest(store, "readwrite", (items) => items.clear()),
};
