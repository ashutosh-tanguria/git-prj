import type { CachedFile } from "./fileCache";
import type { TextMatch, TextPage } from "./textSearch";

export type IndexState =
  "ready" | "tooLarge" | "scanned" | "failed" | "evicted";
export interface IndexMeta {
  key: string;
  scope: string;
  ref: string;
  name: string;
  path: string;
  version: string;
  size: number;
  createdAt: number;
  state: IndexState;
}
export interface TextRecord {
  pages: TextPage[];
  index: string;
}
export type IndexJob =
  | { type: "index"; file: CachedFile; blob?: Blob }
  | { type: "search"; scopes: string[]; query: string };
export type IndexResult =
  | { type: "indexed" }
  | { type: "hits"; results: TextMatch[] }
  | { type: "error" };
export const INDEX_LIMIT = 100_000_000;
export const INDEX_FILE_LIMIT = 150_000_000;
export const indexable = (name: string) =>
  /\.(pdf|md|markdown|txt|text)$/i.test(name);
