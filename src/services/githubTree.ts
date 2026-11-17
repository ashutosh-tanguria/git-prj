import { request, ProviderError } from "../providers/github/client";
import type { GitRef } from "../lib/refs";
export interface GitNode {
  path: string;
  sha: string;
  mode: string;
  type?: string;
  size?: number;
}
interface Tree {
  sha?: string;
  tree: GitNode[];
  truncated?: boolean;
}
export const repoRoot = (ref: Pick<GitRef, "owner" | "repo">) =>
  "/repos/" +
  encodeURIComponent(ref.owner) +
  "/" +
  encodeURIComponent(ref.repo);
export async function completeTree(
  root: string,
  sha: string,
  signal?: AbortSignal,
): Promise<{ tree: GitNode[]; fallback: boolean }> {
  const get = async (id: string, recursive = false): Promise<Tree> =>
    (
      await request(
        root +
          "/git/trees/" +
          encodeURIComponent(id) +
          (recursive ? "?recursive=1" : ""),
        signal,
      )
    ).json();
  const initial = await get(sha, true);
  if (!Array.isArray(initial.tree)) throw new ProviderError("folderIncomplete");
  if (!initial.truncated) return { tree: initial.tree, fallback: false };
  const output: GitNode[] = [];
  const walk = async (id: string, prefix: string, ancestors: Set<string>) => {
    if (ancestors.has(id)) throw new ProviderError("folderIncomplete");
    const data = await get(id);
    if (data.truncated || !Array.isArray(data.tree))
      throw new ProviderError("folderIncomplete");
    for (const node of data.tree) {
      if (!node.path || node.path.includes("/"))
        throw new ProviderError("folderIncomplete");
      const path = prefix + node.path;
      output.push({ ...node, path });
      if (node.mode === "040000")
        await walk(node.sha, path + "/", new Set([...ancestors, id]));
    }
  };
  await walk(initial.sha || sha, "", new Set());
  return { tree: output, fallback: true };
}
export async function repositoryTree(ref: GitRef, signal?: AbortSignal) {
  const root = repoRoot(ref);
  try {
    const head = (await (
      await request(
        root + "/git/ref/heads/" + encodeURIComponent(ref.branch),
        signal,
      )
    ).json()) as { object: { sha: string } };
    const commit = (await (
      await request(root + "/git/commits/" + head.object.sha, signal)
    ).json()) as { tree: { sha: string } };
    return await completeTree(root, commit.tree.sha, signal);
  } catch (error) {
    if ((error as Error).message === "EMPTY_REPO")
      return { tree: [], fallback: false };
    throw error;
  }
}
