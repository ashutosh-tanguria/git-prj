import { request } from "../providers/github/client";
import { parseRef } from "../lib/refs";
export interface EntryMetadata {
  modified: string | null;
  lastChange: string | null;
}
const cache = new Map<string, { value: EntryMetadata; time: number }>();
export async function metadata(
  ref: string,
  signal?: AbortSignal,
): Promise<EntryMetadata> {
  const cached = cache.get(ref);
  if (cached && Date.now() - cached.time < 60000) return cached.value;
  const item = parseRef(ref);
  const params = new URLSearchParams({
    sha: item.branch,
    path: item.path,
    per_page: "1",
  });
  const response = await request(
    "/repos/" +
      encodeURIComponent(item.owner) +
      "/" +
      encodeURIComponent(item.repo) +
      "/commits?" +
      params,
    signal,
  );
  const commits = (await response.json()) as {
    commit: { message: string; author: { date: string } | null };
  }[];
  const value = {
    modified: commits[0]?.commit.author?.date ?? null,
    lastChange: commits[0]?.commit.message?.split("\n")[0] ?? null,
  };
  if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
  cache.set(ref, { value, time: Date.now() });
  return value;
}
export function clearMetadata() {
  cache.clear();
}
