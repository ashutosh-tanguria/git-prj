import * as client from "./client";
import { parseRef, refString } from "../../lib/refs";
import { pushChanges } from "../../services/githubPush";
import { evaluateFile } from "../../services/guards";
import type { Entry, StorageProvider } from "../types";
function entry(e: client.Entry): Entry {
  return { ref: e.ref, name: e.name, kind: e.kind, size: e.kind === "dir" ? null : e.size, modified: e.modified ?? null, hash: e.sha, version: e.sha };
}
export function githubProvider(candidate: () => Promise<string>, wait?: (ms: number) => Promise<void>): StorageProvider {
  return {
    id: "github", capabilities: { maxFileBytes: 95 * 1048576, hasFolders: true, hasVersions: true, atomicBatch: true, hashKind: "git-sha1" },
    async connect() { await client.connect(await candidate()); },
    async disconnect() { client.clearToken(); }, isConnected: client.isConnected,
    async listRoots() { return (await client.repos()).map((r) => { const [owner, repo] = r.full_name.split("/"); return { id: r.full_name, provider: "github" as const, label: r.full_name, root: refString({ owner, repo, branch: r.default_branch, path: "" }), private: r.private, branch: r.default_branch }; }); },
    async list(ref, opts) { return (await client.list(parseRef(ref), opts?.signal)).map(entry); },
    async stat(ref) { const target = parseRef(ref); const parent = { ...target, path: target.path.split("/").slice(0, -1).join("/") }; const found = (await client.list(parent)).find((e) => e.ref === ref); if (!found) throw new client.ProviderError("NOT_FOUND"); return entry(found); },
    read(ref, opts) { const target = parseRef(ref); return client.read({ ...target, branch: opts?.version || target.branch }, opts?.signal); },
    async history(ref) {
      const r = parseRef(ref); const rows = await (await client.request(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/commits?path=${encodeURIComponent(r.path)}&sha=${encodeURIComponent(r.branch)}`)).json() as { sha: string; commit: { message: string; author: { date: string } | null } }[];
      return rows.map((v) => ({ id: v.sha, modified: v.commit.author?.date ?? null, label: v.commit.message }));
    },
    async push(changes, ctx) {
      await pushChanges(changes.map((c) => ({ id: c.id, target: { ...parseRef(c.ref), ...(c.op === "add" ? { path: c.name! } : {}) }, kind: c.op === "mkdir" ? "add" : c.op, blobKey: c.bytesKey, baseVersion: c.baseVersion, size: c.size || 0, createdAt: Date.now(), verdict: evaluateFile(c.size || 0) })), (c) => ctx.readBytes(c.blobKey!), { message: ctx.message || "Update files", publicConfirmed: !!ctx.publicConfirmed, warningsConfirmed: !!ctx.warningsConfirmed, sensitiveConfirmed: !!ctx.sensitiveConfirmed, signal: ctx.signal }, wait);
      for (const c of changes) await ctx.onComplete?.(c.id);
      return { completed: changes.map((c) => c.id) };
    },
    async quota() { return null; },
  };
}
