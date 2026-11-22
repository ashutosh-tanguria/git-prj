let db: Promise<IDBDatabase> | undefined;
function database() {
  return (db ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("shelf-preferences", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("preferences");
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  }));
}
export async function preference<T>(key: string, fallback: T): Promise<T> {
  try {
    return await new Promise<T>((resolve, reject) => {
      void database().then((db) => {
        const request = db
          .transaction("preferences")
          .objectStore("preferences")
          .get(key);
        request.onsuccess = () => resolve(request.result ?? fallback);
        request.onerror = () => reject(request.error);
      }, reject);
    });
  } catch {
    return fallback;
  }
}
export async function savePreference(key: string, value: unknown) {
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("preferences", "readwrite");
      tx.objectStore("preferences").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Preferences are optional; files and credentials are never stored here. */
  }
}
