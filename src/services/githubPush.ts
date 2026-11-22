import { completeTree, repositoryTree } from "./githubTree";
import { conflictingPaths } from "./conflictingPaths";
import { request } from "../providers/github/client";
import type { Change } from "./staging";
import {
  evaluateFile,
  evaluateRepo,
  evaluateName,
  evaluateVisibility,
} from "./guards";
import { GITHUB } from "../lib/limits";
export class ConflictError extends Error {
  constructor(public paths: string[]) {
    super("pushConflict");
  }
}
interface Tree {
  tree: { path: string; sha: string; mode: string; size?: number }[];
  truncated?: boolean;
}
export interface PushOptions {
  message: string;
  publicConfirmed: boolean;
  warningsConfirmed: boolean;
  sensitiveConfirmed: boolean;
  repoOverride?: string;
  signal?: AbortSignal;
  onRef?: () => void;
  beforeRef?: () => Promise<void>;
  onProgress?: (done: number) => void;
}
let last = 0,
  gate = Promise.resolve();
export function base64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 32768)
    text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
function valid(path: string) {
  if (
    !path ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\0") ||
    path.split("/").some((p) => [".", "..", ".git"].includes(p))
  )
    throw Error("pushPath");
}
export async function pushChanges(
  changes: Change[],
  read: (c: Change) => Promise<Blob>,
  options: PushOptions,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
) {
  if (!changes.length || !options.message.trim()) throw Error("pushEmpty");
  const target = changes[0].target;
  if (
    changes.some(
      (c) =>
        c.target.owner !== target.owner ||
        c.target.repo !== target.repo ||
        c.target.branch !== target.branch,
    )
  )
    throw Error("pushTarget");
  const root =
      "/repos/" +
      encodeURIComponent(target.owner) +
      "/" +
      encodeURIComponent(target.repo),
    branch = encodeURIComponent(target.branch);
  const get = async <T>(path: string): Promise<T> =>
    (await request(path, options.signal)).json() as Promise<T>;
  const mutate = async <T>(
    path: string,
    method: string,
    body: unknown,
    ref = false,
  ): Promise<T> => {
    let release = () => {};
    const old = gate;
    gate = new Promise<void>((resolve) => (release = resolve));
    await old;
    try {
      await wait(Math.max(0, 1000 - (Date.now() - last)));
      options.signal?.throwIfAborted();
      if (ref) {
        await options.beforeRef?.();
        options.signal?.throwIfAborted();
        options.onRef?.();
      }
      last = Date.now();
      return (
        await request(path, ref ? undefined : options.signal, false, {
          method,
          body: JSON.stringify(body),
        })
      ).json() as Promise<T>;
    } finally {
      release();
    }
  };
  const repo = await get<{ size?: number; private?: boolean }>(root),
    user = await get<{
      id: number;
      login: string;
      name?: string;
      email?: string;
    }>("/user");
  const visibility = typeof repo.private !== "boolean" ? "unknown" : repo.private ? "private" : "public";
  const visibilityGuard = evaluateVisibility(visibility, options.publicConfirmed);
  if (visibilityGuard.level === "block") throw Error(visibilityGuard.code);
  const blobs = new Map<string, Blob>(),
    reusedSizes = new Map<string, number>();
  if (changes.some((c) => c.blobSha)) {
    const remote = await repositoryTree(target, options.signal);
    for (const c of changes.filter((c) => c.blobSha)) {
      const node = remote.tree.find(
        (n) => n.sha === c.blobSha && ["100644", "100755"].includes(n.mode),
      );
      if (!node || !Number.isSafeInteger(node.size))
        throw Error("folderSourceChanged");
      const guard = evaluateFile(node.size!);
      if (
        guard.level === "block" ||
        (guard.level === "warn" && !options.warningsConfirmed)
      )
        throw Error(guard.code);
      reusedSizes.set(c.id, node.size!);
    }
  }
  for (const c of changes) {
    valid(c.target.path);
    if (c.oldPath) valid(c.oldPath);
    if (c.blobKey) {
      const blob = await read(c);
      const verdict = evaluateFile(blob.size);
      if (
        verdict.level === "block" ||
        (verdict.level === "warn" && !options.warningsConfirmed)
      )
        throw Error(verdict.code);
      blobs.set(c.id, blob);
    }
    if (
      evaluateName(c.target.path, visibility).level ===
        "warn" &&
      !options.sensitiveConfirmed
    )
      throw Error("guardNameSensitive");
  }
  const repoGuard = evaluateRepo(
    repo.size ?? null,
    [...blobs.values()].reduce((sum, b) => sum + b.size, 0) +
      [...reusedSizes.values()].reduce((a, b) => a + b, 0),
  );
  if (
    (repoGuard.level === "block" && (repoGuard.code !== "guardRepoBlock" || !options.repoOverride?.trim())) ||
    (repoGuard.level === "warn" && !options.warningsConfirmed)
  )
    throw Error(repoGuard.code);
  const batches: Change[][] = [];
  let current: Change[] = [],
    bytes = 0;
  for (const c of changes) {
    const size = blobs.get(c.id)?.size ?? reusedSizes.get(c.id) ?? 0;
    if (bytes + size > GITHUB.BATCH_CAP) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(c);
    bytes += size;
  }
  if (current.length) batches.push(current);
  const results: string[] = [];
  const expectedRoots = new Map<string, string | undefined>(
    changes.flatMap((c) =>
      c.replaceTree ? [[c.replaceTree.path, c.replaceTree.sha] as const] : [],
    ),
  );
  let completed = 0;
  for (const batch of batches) {
    let head: string, tree: Tree;
    try {
      const ref = await get<{ object: { sha: string } }>(
        root + "/git/ref/heads/" + branch,
      );
      head = ref.object.sha;
      const commit = await get<{ tree: { sha: string } }>(
        root + "/git/commits/" + head,
      );
      tree = await completeTree(root, commit.tree.sha, options.signal);
    } catch (error) {
      if ((error as Error).message !== "EMPTY_REPO") throw error;
      const first = batch[0],
        blob = blobs.get(first.id);
      if (first.kind !== "add" || !blob) throw error;
      const created = await mutate<{ commit: { sha: string } }>(
        root +
          "/contents/" +
          first.target.path.split("/").map(encodeURIComponent).join("/"),
        "PUT",
        {
          message: options.message,
          branch: target.branch,
          content: base64(new Uint8Array(await blob.arrayBuffer())),
        },
        true,
      );
      results.push(created.commit.sha);
      options.onProgress?.(++completed);
      batch.shift();
      if (!batch.length) continue;
      head = created.commit.sha;
      const commit = await get<{ tree: { sha: string } }>(
        root + "/git/commits/" + head,
      );
      tree = await completeTree(root, commit.tree.sha, options.signal);
    }
    if (tree.truncated) throw Error("pushTruncated");
    const conflicts = (remote: Tree) =>
      conflictingPaths(
        batch.map((c) =>
          c.replaceTree
            ? {
                ...c,
                replaceTree: {
                  path: c.replaceTree.path,
                  sha: expectedRoots.get(c.replaceTree.path),
                },
              }
            : c,
        ),
        remote,
      );
    for (const c of batch.filter((c) => c.blobSha)) {
      const original = tree.tree.find(
        (n) => n.sha === c.blobSha && ["100644", "100755"].includes(n.mode),
      );
      if (
        !original ||
        !("size" in original) ||
        !Number.isSafeInteger(original.size)
      )
        throw Error("folderSourceChanged");
      const guard = evaluateFile(original.size as number);
      if (
        guard.level === "block" ||
        (guard.level === "warn" && !options.warningsConfirmed)
      )
        throw Error(guard.code);
    }
    const bad = conflicts(tree);
    if (bad.length) throw new ConflictError(bad);
    const entries: {
      path: string;
      mode: string;
      type: string;
      sha: string | null;
    }[] = [];
    for (const c of batch) {
      let sha = c.blobSha || c.baseVersion || null;
      const blob = blobs.get(c.id);
      if (blob)
        sha = (
          await mutate<{ sha: string }>(root + "/git/blobs", "POST", {
            encoding: "base64",
            content: base64(new Uint8Array(await blob.arrayBuffer())),
          })
        ).sha;
      if (c.kind === "rename")
        entries.push({
          path: c.oldPath!,
          mode: "100644",
          type: "blob",
          sha: null,
        });
      entries.push({
        path: c.target.path,
        mode:
          tree.tree.find((e) => e.path === (c.oldPath || c.target.path))
            ?.mode ||
          c.fileMode ||
          "100644",
        type: c.treeDelete ? "tree" : "blob",
        sha: c.kind === "delete" ? null : sha,
      });
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const base = await get<{ tree: { sha: string } }>(
        root + "/git/commits/" + head,
      );
      const next = await mutate<{ sha: string }>(root + "/git/trees", "POST", {
        base_tree: base.tree.sha,
        tree: entries,
      });
      const commit = await mutate<{ sha: string }>(
        root + "/git/commits",
        "POST",
        {
          message: options.message,
          tree: next.sha,
          parents: [head],
          author: {
            name: user.name || user.login,
            email:
              user.email || `${user.id}+${user.login}@users.noreply.github.com`,
          },
        },
      );
      try {
        await mutate(
          root + "/git/refs/heads/" + branch,
          "PATCH",
          { sha: commit.sha, force: false },
          true,
        );
        results.push(commit.sha);
        options.onProgress?.(++completed);
        if (expectedRoots.size && batch !== batches.at(-1)) {
          const after = await completeTree(root, next.sha, options.signal);
          for (const path of expectedRoots.keys())
            expectedRoots.set(
              path,
              after.tree.find((n) => n.path === path)?.sha,
            );
        }
        break;
      } catch (error) {
        if ((error as Error).message !== "CONFLICT" || attempt) throw error;
        head = (
          await get<{ object: { sha: string } }>(
            root + "/git/ref/heads/" + branch,
          )
        ).object.sha;
        const latest = await get<{ tree: { sha: string } }>(
          root + "/git/commits/" + head,
        );
        const remote = await completeTree(
          root,
          latest.tree.sha,
          options.signal,
        );

        const paths = conflicts(remote);
        if (paths.length) throw new ConflictError(paths);
      }
    }
  }
  return results;
}
