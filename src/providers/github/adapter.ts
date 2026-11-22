import * as client from "./client";
import { parseRef, refString } from "../../lib/refs";
import { pushChanges } from "../../services/githubPush";
import { evaluateBatch, evaluateFile, evaluateName, evaluateRepo, evaluateVisibility } from "../../services/guards";
import { readBody } from "../http";
import { GITHUB } from "../../lib/limits";
import type { Entry, StorageProvider } from "../types";
function entry(e: client.Entry): Entry {
  return { ref: e.ref, name: e.name, kind: e.kind, size: e.kind === "dir" ? null : e.size, modified: e.modified ?? null, hash: e.sha, version: e.sha };
}
export function githubProvider(candidate: () => Promise<string>, wait?: (ms: number) => Promise<void>): StorageProvider {
  return {
    id: "github", capabilities: { maxFileBytes: GITHUB.FILE_BLOCK_AT, hasFolders: true, hasVersions: true, atomicBatch: true, hashKind: "git-sha1" },
    async connect() { await client.connect(await candidate()); },
    async disconnect() { client.clearToken(); }, isConnected: client.isConnected,
    async listRoots() { return (await client.repos()).map((r) => { const [owner, repo] = r.full_name.split("/"); return { id: r.full_name, provider: "github" as const, label: r.full_name, root: refString({ owner, repo, branch: r.default_branch, path: "" }), private: r.private, branch: r.default_branch }; }); },
    async list(ref, opts) { return (await client.list(parseRef(ref), opts?.signal)).map(entry); },
    async stat(ref) { const target = parseRef(ref); const parent = { ...target, path: target.path.split("/").slice(0, -1).join("/") }; const found = (await client.list(parent)).find((e) => e.ref === ref); if (!found) throw new client.ProviderError("NOT_FOUND"); return entry(found); },
    async read(ref, opts) {
      const target = parseRef(ref);
      return readBody(await client.openRead({ ...target, branch: opts?.version || target.branch }, opts?.signal, opts?.blobSha), opts);
    },
    async preflightTransfer(ref, name, size, ctx) {
      const { owner, repo } = parseRef(ref);
      const path = "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo);
      const remote = await (await client.request(path, ctx.signal)).json() as { size?: number; private?: boolean };
      const visibility = typeof remote.private !== "boolean" ? "unknown" : remote.private ? "private" : "public";
      const file = evaluateFile(size);
      const projected = evaluateRepo(remote.size ?? null, size);
      for (const verdict of [file, evaluateBatch([size]), evaluateVisibility(visibility, ctx.publicConfirmed)]) {
        if (verdict.level === "block") throw new client.ProviderError(verdict.code);
      }
      if (projected.level === "block" && (projected.code !== "guardRepoBlock" || !ctx.repoOverride?.trim()))
        throw new client.ProviderError(projected.code);
      if (!ctx.warningsConfirmed && (file.level === "warn" || projected.level === "warn"))
        throw new client.ProviderError(file.level === "warn" ? file.code : projected.code);
      if (!ctx.sensitiveConfirmed && evaluateName(name, visibility).level === "warn")
        throw new client.ProviderError("guardNameSensitive");
    },
    async history(ref) {
      const r = parseRef(ref); const rows = await (await client.request(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/commits?path=${encodeURIComponent(r.path)}&sha=${encodeURIComponent(r.branch)}`)).json() as { sha: string; commit: { message: string; author: { date: string } | null } }[];
      return rows.map((v) => ({ id: v.sha, modified: v.commit.author?.date ?? null, label: v.commit.message }));
    },
    async push(changes, ctx) {
      if (ctx.onAttempt && changes.length !== 1) throw new client.ProviderError("CONFLICT");
      await pushChanges(changes.map((c) => {
        const target = parseRef(c.ref);
        if (c.op === "add") target.path = [target.path, c.name].filter(Boolean).join("/");
        return { id: c.id, target, kind: c.op === "mkdir" ? "add" : c.op, blobKey: c.bytesKey, baseVersion: c.baseVersion, size: c.size || 0, createdAt: Date.now(), verdict: evaluateFile(c.size || 0) };
      }), (c) => ctx.readBytes(c.blobKey!), {
        message: ctx.message || "Update files", publicConfirmed: !!ctx.publicConfirmed,
        warningsConfirmed: !!ctx.warningsConfirmed, sensitiveConfirmed: !!ctx.sensitiveConfirmed,
        repoOverride: ctx.repoOverride, signal: ctx.signal,
        beforeRef: ctx.onAttempt && (() => ctx.onAttempt!(changes[0].id)),
        onProgress: () => {
          for (const c of changes) if (c.size !== undefined) ctx.onProgress?.(c.id, c.size, c.size);
        },
      }, wait);
      for (const c of changes) await ctx.onComplete?.(c.id);
      return { completed: changes.map((c) => c.id) };
    },
    async quota() { return null; },
  };
}
