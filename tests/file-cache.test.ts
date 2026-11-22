import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheData } from "../src/services/cacheData";
import {
  changeCacheCap,
  clearCache,
  evictionOrder,
  getCachedFile,
  pinCachedFile,
  storeCachedFile,
} from "../src/services/fileCache";
import { wipeLocalData } from "../src/services/wipeLocalData";

vi.mock("../src/services/cacheData", () => {
  const stores = new Map<string, Map<string, unknown>>();
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  return {
    cacheData: {
      get: async (name: string, key: string) => store(name).get(key),
      all: async (name: string) => [...store(name).values()],
      put: async (name: string, key: string, value: unknown) =>
        store(name).set(key, value),
      remove: async (name: string, key: string) => store(name).delete(key),
      clear: async (name: string) => store(name).clear(),
    },
  };
});

const file = (name: string, version = "v1") => ({
  name,
  version,
  scope: "github:ada",
  ref: "gh:ada/notes@main/" + name,
  path: name,
});

beforeEach(async () => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  await cacheData.clear("settings");
  await clearCache();
});
afterEach(() => vi.unstubAllGlobals());

describe("library byte cap", () => {
  it("evicts by oldest use and exempts pins even above the cap", () => {
    const oldest = { lastUsed: 1, pinned: false, size: 100 };
    const newest = { lastUsed: 2, pinned: false, size: 50 };
    const pinned = { lastUsed: 0, pinned: true, size: 60 };
    expect(evictionOrder([newest, pinned, oldest], 110)).toEqual([oldest]);
    expect(evictionOrder([newest, pinned, oldest], 1)).toEqual([
      oldest,
      newest,
    ]);
  });

  it("pins cached bytes across cap changes and lets unpin evict them", async () => {
    await storeCachedFile(file("pinned"), new Blob(["large"]));
    await pinCachedFile(file("pinned"), true);
    await changeCacheCap(1);
    expect(await (await getCachedFile(file("pinned")))?.text()).toBe("large");
    await pinCachedFile(file("pinned"), false);
    expect(await getCachedFile(file("pinned"))).toBeUndefined();
  });

  it("replaces only the older version and retains its pin", async () => {
    await storeCachedFile(file("book"), new Blob(["old"]), true);
    expect(await getCachedFile(file("book", "v2"))).toBeUndefined();
    await storeCachedFile(file("book", "v2"), new Blob(["new"]));
    await changeCacheCap(1);
    expect(await getCachedFile(file("book"))).toBeUndefined();
    expect(await (await getCachedFile(file("book", "v2")))?.text()).toBe("new");
    expect(await cacheData.all("bytes")).toHaveLength(1);
    await cacheData.put("staged", "draft", new Blob(["working bytes"]));
    await clearCache();
    expect(await getCachedFile(file("book", "v2"))).toBeUndefined();
    expect(await cacheData.get("staged", "draft")).toBeInstanceOf(Blob);
  });
});

it("wipes every Shelf database, private file directory and storage cache", async () => {
  const deleted: string[] = [];
  const removeEntry = vi.fn(async () => {});
  const clear = vi.fn();
  const deleteCache = vi.fn(async () => true);
  vi.stubGlobal("navigator", {
    storage: {
      getDirectory: async () => ({
        keys: () => ["files", "staged", "media-cache"],
        removeEntry,
      }),
    },
  });
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("indexedDB", {
    databases: async () => [{ name: "shelf-future" }, { name: "other-app" }],
    deleteDatabase: (name: string) => {
      deleted.push(name);
      const request: { onsuccess?: () => void } = {};
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  });
  vi.stubGlobal("localStorage", { clear });
  vi.stubGlobal("sessionStorage", { clear });
  vi.stubGlobal("caches", {
    keys: async () => ["shelf-shell-test"],
    delete: deleteCache,
  });
  await wipeLocalData();
  expect(deleted.sort()).toEqual([
    "shelf-future",
    "shelf-github-oauth",
    "shelf-library",
    "shelf-media-cache",
    "shelf-preferences",
    "shelf-working-copy",
  ]);
  expect(removeEntry.mock.calls).toHaveLength(3);
  expect(clear).toHaveBeenCalledTimes(2);
  expect(deleteCache).toHaveBeenCalledWith("shelf-shell-test");
});

it("serves expired listings immediately, then conditionally revalidates with the saved ETag", async () => {
  const { listCached } = await import("../src/services/listingCache");
  const scope = "github:ada";
  const ref = "folder";
  await cacheData.put("listings", JSON.stringify([scope, ref]), {
    scope,
    ref,
    entries: ["old"],
    etag: '"cached"',
    fetchedAt: Date.now() - 60_001,
  });
  const load = vi.fn(async () => ({ entries: ["new"], etag: '"fresh"' }));
  const onUpdate = vi.fn();
  expect(await listCached(scope, ref, load, { onUpdate })).toEqual(["old"]);
  await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledWith(["new"]));
  expect(load).toHaveBeenCalledWith('"cached"');
  expect(await listCached(scope, ref, load)).toEqual(["new"]);
  expect(load).toHaveBeenCalledTimes(1);
  const notModified = vi.fn(async () => ({}));
  expect(await listCached(scope, ref, notModified, { force: true })).toEqual([
    "new",
  ]);
  expect(notModified).toHaveBeenCalledWith('"fresh"');
});
