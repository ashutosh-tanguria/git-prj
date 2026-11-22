import { clearToken } from "../providers/github/client";

const databaseNames = [
  "shelf-working-copy",
  "shelf-preferences",
  "shelf-media-cache",
  "shelf-library",
];

let wiping = false;
export const localWipeInProgress = () => wiping;

export async function wipeLocalData() {
  wiping = true;
  clearToken();
  const channel =
    typeof BroadcastChannel === "undefined"
      ? undefined
      : new BroadcastChannel("shelf-reset");
  channel?.postMessage("start");
  try {
    const names = new Set(databaseNames);
    for (const { name } of (await indexedDB.databases?.()) ?? [])
      if (name?.startsWith("shelf-")) names.add(name);
    if (navigator.storage?.getDirectory) {
      const directory = await navigator.storage.getDirectory();
      const entries: string[] = [];
      for await (const name of directory.keys()) entries.push(name);
      for (const name of entries)
        await directory.removeEntry(name, { recursive: true });
    }
    await Promise.all(
      [...names].map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(Error("storageBlocked"));
          }),
      ),
    );
    for (const storage of [localStorage, sessionStorage]) storage.clear();
    if (typeof caches !== "undefined")
      for (const name of await caches.keys()) await caches.delete(name);
  } catch (error) {
    wiping = false;
    throw error;
  } finally {
    channel?.postMessage("finish");
    channel?.close();
  }
}
