import { SequentialProvider } from "../sequential";
import {
  ProviderError,
  type Capabilities,
  type Entry,
  type Change,
  type PushContext,
  type ReadOptions,
} from "../types";
import { readBody, allowedUrl } from "../http";
import type { Auth } from "../auth";
const API = "https://www.googleapis.com/drive/v3";
const FIELDS =
  "id,name,mimeType,size,modifiedTime,md5Checksum,headRevisionId,version,parents,trashed";
interface File {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  md5Checksum?: string;
  headRevisionId?: string;
  version?: string;
  parents?: string[];
  trashed?: boolean;
}
function normalize(f: File): Entry {
  return {
    ref: "gd:" + f.id,
    name: f.name,
    kind: f.mimeType === "application/vnd.google-apps.folder" ? "dir" : "file",
    size: f.size === undefined ? null : Number(f.size),
    modified: f.modifiedTime ?? null,
    hash: f.md5Checksum ?? null,
    version: f.headRevisionId || f.version || null,
  };
}
function id(ref: string) {
  if (!/^gd:[^/]+$/.test(ref)) throw new ProviderError("PERMISSION");
  return encodeURIComponent(ref.slice(3));
}
export class DriveProvider extends SequentialProvider {
  readonly id = "gdrive" as const;
  readonly capabilities: Capabilities = {
    maxFileBytes: null,
    hasFolders: true,
    hasVersions: true,
    atomicBatch: false,
    hashKind: "md5",
  };
  private folder?: string;
  constructor(auth: Auth) {
    super(auth, ["www.googleapis.com"]);
  }
  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    return (await this.request(API + path, init)).json() as Promise<T>;
  }
  private async appFolder(create = false) {
    if (this.folder) return this.folder;
    const params = new URLSearchParams({
      q: "trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='shelf' and value='root' }",
      fields: "files(id)",
      pageSize: "100",
    });
    const result = await this.json<{ files: { id: string }[] }>(
      "/files?" + params,
    );
    if (result.files.length > 1) throw new ProviderError("CONFLICT");
    this.folder = result.files[0]?.id;
    if (!this.folder && create)
      this.folder = (
        await this.json<File>("/files?fields=" + FIELDS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Shelf",
            mimeType: "application/vnd.google-apps.folder",
            appProperties: { shelf: "root" },
          }),
        })
      ).id;
    return this.folder;
  }
  async disconnect() {
    this.folder = undefined;
    await super.disconnect();
  }
  async listRoots() {
    const account = await this.json<{ user: { permissionId: string } }>(
      "/about?fields=user(permissionId)",
    );
    const folder = await this.appFolder();
    return [
      {
        id: "gdrive:" + account.user.permissionId,
        provider: this.id,
        label: "Google Drive",
        root: "gd:" + (folder || "app-root"),
      },
    ];
  }
  async list(ref: string, opts?: { signal?: AbortSignal }) {
    const folder =
      ref === "gd:app-root"
        ? await this.appFolder()
        : decodeURIComponent(id(ref));
    if (!folder) return [];
    const rows: Entry[] = [];
    let token = "";
    const seen = new Set<string>();
    do {
      const params = new URLSearchParams({
        q:
          "'" +
          folder.replaceAll("'", "\\'") +
          "' in parents and trashed=false",
        fields: "nextPageToken,files(" + FIELDS + ")",
        pageSize: "100",
        ...(token ? { pageToken: token } : {}),
      });
      const page = await this.json<{ files: File[]; nextPageToken?: string }>(
        "/files?" + params,
        { signal: opts?.signal },
      );
      rows.push(...page.files.map(normalize));
      token = page.nextPageToken || "";
      if (token && seen.has(token)) throw new ProviderError("PROVIDER_DOWN");
      seen.add(token);
    } while (token);
    return rows;
  }
  async stat(ref: string) {
    const file = await this.json<File>(
      "/files/" + id(ref) + "?fields=" + FIELDS,
    );
    if (file.trashed) throw new ProviderError("NOT_FOUND");
    return normalize(file);
  }
  async read(
    ref: string,
    opts?: ReadOptions,
  ) {
    return readBody(
      await this.request(
        API +
          "/files/" +
          id(ref) +
          (opts?.version
            ? "/revisions/" + encodeURIComponent(opts.version)
            : "") +
          "?alt=media",
        { signal: opts?.signal },
      ),
      opts,
    );
  }
  async history(ref: string) {
    const result: { id: string; modified: string | null; label: string }[] = [];
    let token = "";
    const seen = new Set<string>();
    do {
      const page = await this.json<{
        revisions: { id: string; modifiedTime?: string }[];
        nextPageToken?: string;
      }>(
        "/files/" +
          id(ref) +
          "/revisions?fields=nextPageToken,revisions(id,modifiedTime)&pageSize=100&pageToken=" +
          encodeURIComponent(token),
      );
      result.push(
        ...page.revisions.map((v) => ({
          id: v.id,
          modified: v.modifiedTime ?? null,
          label: v.id,
        })),
      );
      token = page.nextPageToken || "";
      if (token && seen.has(token)) throw new ProviderError("PROVIDER_DOWN");
      seen.add(token);
    } while (token);
    return result;
  }
  async quota() {
    const q = await this.json<{
      storageQuota: { usage: string; limit?: string };
    }>("/about?fields=storageQuota");
    return q.storageQuota.limit
      ? {
          used: Number(q.storageQuota.usage),
          total: Number(q.storageQuota.limit),
        }
      : null;
  }
  async reserveCreate(signal?: AbortSignal) {
    const { ids } = await this.json<{ ids: string[] }>("/files/generateIds?count=1&space=drive", { signal });
    if (ids.length !== 1 || !/^[a-z\d_-]+$/i.test(ids[0])) throw new ProviderError("PROVIDER_DOWN");
    return ids[0];
  }
  protected async write(c: Change, blob: Blob | undefined, ctx: PushContext) {
    const parent =
      c.parent === "gd:app-root" || c.ref === "gd:app-root"
        ? await this.appFolder(true)
        : c.parent?.slice(3);
    const existing =
      c.op === "modify" || c.op === "delete" || c.op === "rename";
    const path = existing ? "/files/" + id(c.ref) : "/files";
    // Capture an ETag and recheck version immediately before conditional mutation.
    const preflight = existing
      ? await this.request(API + "/files/" + id(c.ref) + "?fields=" + FIELDS)
      : undefined;
    const current = preflight ? ((await preflight.json()) as File) : undefined;
    if (
      current &&
      (current.trashed || normalize(current).version !== c.baseVersion)
    )
      throw new ProviderError("CONFLICT");
    const etag = preflight?.headers.get("ETag");
    if (existing && !etag) throw new ProviderError("PERMISSION");
    const headers = {
      "Content-Type": "application/json",
      ...(etag ? { "If-Match": etag } : {}),
    };
    if (c.op === "delete") {
      await this.request(API + path, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ trashed: true }),
        signal: ctx.signal,
      });
      return;
    }
    const meta = {
      ...(c.name ? { name: c.name } : {}),
      ...(!existing ? { parents: [parent] } : {}),
      ...(!existing && c.createId ? { id: c.createId } : {}),
      ...(c.op === "mkdir"
        ? { mimeType: "application/vnd.google-apps.folder" }
        : {}),
    };
    const params = new URLSearchParams({ fields: FIELDS });
    if (c.op === "rename" && parent && !current?.parents?.includes(parent)) {
      params.set("addParents", parent);
      if (current?.parents?.length)
        params.set("removeParents", current.parents.join(","));
    }
    if (!blob)
      return normalize(
        await this.json<File>(path + "?" + params, {
          method: existing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(meta),
          signal: ctx.signal,
        }),
      );
    const url =
      "https://www.googleapis.com/upload/drive/v3" + path + "?fields=" + FIELDS;
    if (blob.size > 5 * 1048576) {
      const start = await this.request(url + "&uploadType=resumable", {
        method: existing ? "PATCH" : "POST",
        headers: {
          ...headers,
          "X-Upload-Content-Type": blob.type || "application/octet-stream",
          "X-Upload-Content-Length": String(blob.size),
        },
        body: JSON.stringify(meta),
        signal: ctx.signal,
      });
      const session = start.headers.get("Location");
      if (!session) throw new ProviderError("PROVIDER_DOWN");
      allowedUrl(session, ["www.googleapis.com"]);
      for (let offset = 0; offset < blob.size; offset += 8 * 1048576) {
        const end = Math.min(offset + 8 * 1048576, blob.size);
        const response = await this.request(session, {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${offset}-${end - 1}/${blob.size}`,
          },
          body: blob.slice(offset, end),
          signal: ctx.signal,
        });
        ctx.onProgress?.(c.id, end, blob.size);
        if (end === blob.size && response.ok)
          return normalize((await response.json()) as File);
        const range = response.headers.get("Range");
        if (range !== `bytes=0-${end - 1}`)
          throw new ProviderError("CONFLICT", false, { uncertain: true });
      }
      throw new ProviderError("UNKNOWN");
    }
    const boundary = "shelf-" + crypto.randomUUID();
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ]);
    const result = (await (
      await this.request(url + "&uploadType=multipart", {
        method: existing ? "PATCH" : "POST",
        headers: {
          ...headers,
          "Content-Type": "multipart/related; boundary=" + boundary,
        },
        body,
        signal: ctx.signal,
      })
    ).json()) as File;
    ctx.onProgress?.(c.id, blob.size, blob.size);
    return normalize(result);
  }
}
