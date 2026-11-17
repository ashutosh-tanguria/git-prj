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
  tree: { path: string; sha: string; mode: string }[];
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
      last = Date.now();
      if (ref) options.onRef?.();
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
  const repo = await get<{ size: number; private: boolean }>(root),
    user = await get<{
      id: number;
      login: string;
      name?: string;
      email?: string;
    }>("/user");
  if (
    evaluateVisibility(
      repo.private ? "private" : "public",
      options.publicConfirmed,
    ).level === "block"
  )
    throw Error("guardVisibilityConfirm");
  const blobs = new Map<string, Blob>();
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
      evaluateName(c.target.path, repo.private ? "private" : "public").level ===
        "warn" &&
      !options.sensitiveConfirmed
    )
      throw Error("guardNameSensitive");
  }
  const repoGuard = evaluateRepo(
    repo.size,
    [...blobs.values()].reduce((sum, b) => sum + b.size, 0),
  );
  if (
    (repoGuard.level === "block" && !options.repoOverride?.trim()) ||
    (repoGuard.level === "warn" && !options.warningsConfirmed)
  )
    throw Error(repoGuard.code);
  const batches: Change[][] = [];
  let current: Change[] = [],
    bytes = 0;
  for (const c of changes) {
    const size = blobs.get(c.id)?.size || 0;
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
      tree = await get<Tree>(
        root + "/git/trees/" + commit.tree.sha + "?recursive=1",
      );
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
      tree = await get<Tree>(
        root + "/git/trees/" + commit.tree.sha + "?recursive=1",
      );
    }
    if (tree.truncated) throw Error("pushTruncated");
    const conflicts = (remote: Tree) =>
      batch
        .filter((c) => {
          const existing = remote.tree.find(
            (e) => e.path === (c.oldPath || c.target.path),
          );
          return c.kind === "add"
            ? !!existing
            : !existing ||
                !c.baseVersion ||
                existing.sha !== c.baseVersion ||
                existing?.mode === "120000" ||
                existing?.mode === "160000" ||
                !!(
                  c.kind === "rename" &&
                  remote.tree.some((e) => e.path === c.target.path)
                );
        })
        .map((c) => c.target.path);
    const bad = conflicts(tree);
    if (bad.length) throw new ConflictError(bad);
    const entries: {
      path: string;
      mode: string;
      type: string;
      sha: string | null;
    }[] = [];
    for (const c of batch) {
      let sha = c.baseVersion || null;
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
            ?.mode || "100644",
        type: "blob",
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
        const remote = await get<Tree>(
          root + "/git/trees/" + latest.tree.sha + "?recursive=1",
        );
        if (remote.truncated) throw Error("pushTruncated");
        const paths = conflicts(remote);
        if (paths.length) throw new ConflictError(paths);
      }
    }
  }
  return results;
}
