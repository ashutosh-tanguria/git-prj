import type {
  GitHubOAuthSession,
  RefreshCredential,
  RefreshStorage,
} from "./oauthSession";

const databaseName = "shelf-github-oauth";
const storeName = "vault";
const recordKey = "refresh";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
interface RecordData {
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  encrypted: ArrayBuffer;
  minutes: number;
}
let failures = 0;
let retryAt = 0;

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(databaseName, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(storeName);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  db.onversionchange = () => db.close();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const load = (): Promise<RecordData | undefined> =>
  transaction("readonly", (store) => store.get(recordKey));
const lock: RefreshStorage["lock"] = (run) =>
  navigator.locks.request(databaseName, run);
export const forgetGitHubVault = () =>
  lock(() => transaction("readwrite", (store) => store.delete(recordKey)));
export const hasGitHubVault = async () => !!(await load());

async function derive(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 600000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function access(
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  minutes: number,
): RefreshStorage {
  return {
    lock,
    async read() {
      const saved = await load();
      if (!saved) return;
      const bytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: saved.iv },
        key,
        saved.encrypted,
      );
      return JSON.parse(decoder.decode(bytes)) as RefreshCredential;
    },
    async write(value) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(JSON.stringify(value)),
      );
      await transaction("readwrite", (store) =>
        store.put({ salt, iv, encrypted, minutes }, recordKey),
      );
    },
  };
}

export async function rememberGitHubVault(
  session: GitHubOAuthSession,
  passphrase: string,
  minutes: number,
) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(passphrase, salt);
  const store = access(key, salt, minutes);
  await store.lock(() => session.remember(store));
}

export async function unlockGitHubVault(passphrase: string) {
  if (Date.now() < retryAt) throw Error("githubTryLater");
  const saved = await load();
  if (!saved) throw Error("githubSignInError");
  const store = access(
    await derive(passphrase, saved.salt),
    saved.salt,
    saved.minutes,
  );
  try {
    await store.read();
  } catch {
    failures++;
    retryAt = Date.now() + Math.min(60000, 1000 * 2 ** failures);
    throw Error("githubWrongPassphrase");
  }
  failures = 0;
  retryAt = 0;
  return { store, minutes: saved.minutes };
}

export function watchGitHubIdle(
  session: GitHubOAuthSession,
  minutes: number,
  onLock: () => void,
) {
  let timer: ReturnType<typeof setTimeout>;
  const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(onLock, minutes * 60000);
  };
  for (const event of events)
    window.addEventListener(event, reset, { passive: true });
  reset();
  session.onClose(() => {
    clearTimeout(timer);
    for (const event of events) window.removeEventListener(event, reset);
  });
}
