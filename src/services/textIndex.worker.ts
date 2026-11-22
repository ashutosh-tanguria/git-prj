import { cacheData } from "./cacheData";
import { fileCacheKey, type CachedFile } from "./fileCache";
import {
  buildTextIndex,
  findText,
  normalizeText,
  type TextMatch,
} from "./textSearch";
import {
  INDEX_FILE_LIMIT,
  INDEX_LIMIT,
  type IndexJob,
  type IndexMeta,
  type IndexResult,
  type TextRecord,
} from "./textIndexTypes";

const post = (result: IndexResult) => self.postMessage(result);

async function indexFile(file: CachedFile, blob?: Blob) {
  const key = fileCacheKey(file);
  const meta: IndexMeta = {
    key,
    scope: file.scope,
    ref: file.ref,
    name: file.name,
    path: file.path,
    version: file.version,
    size: 0,
    createdAt: Date.now(),
    state: "failed",
  };
  let record: TextRecord | undefined;
  if (file.size > INDEX_FILE_LIMIT) {
    meta.state = "tooLarge";
  } else if (blob) {
    try {
      const pdf = /\.pdf$/i.test(file.name);
      const pages = pdf
        ? await (await import("./extractPages")).extractPages(blob)
        : [{ id: 1, text: normalizeText(await blob.text()) }];
      if (pdf && !pages.some((page) => page.text)) {
        meta.state = "scanned";
      } else {
        const index = buildTextIndex(pages);
        meta.size = new Blob([index, JSON.stringify(pages)]).size;
        if (meta.size <= INDEX_LIMIT) {
          record = { pages, index };
          meta.state = "ready";
        } else {
          meta.state = "tooLarge";
        }
      }
    } catch {
      meta.state = "failed";
    }
  }
  if (!blob && meta.state !== "tooLarge") return;

  const commit = async () => {
    if (
      (await cacheData.get<CachedFile>("cachefiles", key))?.version !==
      meta.version
    )
      return;
    if (record) {
      const rows = (await cacheData.all<IndexMeta>("indexmeta"))
        .filter((row) => row.key !== key && row.state === "ready")
        .sort((a, b) => a.createdAt - b.createdAt);
      let size = rows.reduce((total, row) => total + row.size, meta.size);
      for (const row of rows) {
        if (size <= INDEX_LIMIT) break;
        await cacheData.remove("textindex", row.key);
        await cacheData.put("indexmeta", row.key, {
          ...row,
          state: "evicted",
          size: 0,
        });
        size -= row.size;
      }
      await cacheData.put("textindex", key, record);
    }
    await cacheData.put("indexmeta", key, meta);
  };
  if (navigator.locks)
    await navigator.locks.request("shelf-file-cache", commit);
  else await commit();
}

async function search(scopes: string[], query: string) {
  const matches: TextMatch[] = [];
  for (const row of await cacheData.all<IndexMeta>("indexmeta")) {
    if (row.state !== "ready" || !scopes.includes(row.scope)) continue;
    const file = await cacheData.get<CachedFile>("cachefiles", row.key);
    if (!file || file.version !== row.version) continue;
    const record = await cacheData.get<TextRecord>("textindex", row.key);
    if (!record) continue;
    matches.push(
      ...findText(record.pages, record.index, query)
        .slice(0, 40)
        .map((hit) => ({
          ...hit,
          scope: row.scope,
          ref: row.ref,
          path: row.path,
          name: row.name,
        })),
    );
    matches.sort((a, b) => b.score - a.score);
    matches.length = Math.min(matches.length, 40);
  }
  return matches;
}

self.onmessage = ({ data }: MessageEvent<IndexJob>) => {
  void (
    data.type === "index"
      ? indexFile(data.file, data.blob).then(() => post({ type: "indexed" }))
      : search(data.scopes, data.query).then((results) =>
          post({ type: "hits", results }),
        )
  ).catch(() => post({ type: "error" }));
};
