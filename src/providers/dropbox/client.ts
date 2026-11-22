import type { Auth } from "../auth";
import { readBody } from "../http";
import { SequentialProvider } from "../sequential";
import {
  ProviderError,
  type Capabilities,
  type Change,
  type Entry,
  type Location,
  type PushContext,
  type ReadOptions,
} from "../types";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";
const ROOT = "db:app-root";
const SINGLE_UPLOAD_BYTES = 150 * 1024 * 1024;
const CHUNK_BYTES = 8 * 1024 * 1024;
interface Item {
  ".tag": "file" | "folder" | "deleted";
  id: string;
  name: string;
  path_display?: string;
  rev?: string;
  size?: number;
  server_modified?: string;
  content_hash?: string;
}
interface Page {
  entries: Item[];
  cursor: string;
  has_more: boolean;
}
function entry(item: Item): Entry {
  return {
    ref: "db:" + item.id,
    name: item.name,
    kind: item[".tag"] === "folder" ? "dir" : "file",
    size: item.size ?? null,
    modified: item.server_modified ?? null,
    hash: item.content_hash ?? null,
    version: item.rev ?? null,
  };
}
function id(ref: string) {
  if (ref === ROOT) return "";
  if (!/^db:id:[^/]+$/.test(ref)) throw new ProviderError("PERMISSION");
  return ref.slice(3);
}
function header(value: object) {
  return JSON.stringify(value).replace(
    /[^\x20-\x7e]/g,
    (character) =>
      "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

export class DropboxProvider extends SequentialProvider {
  readonly id = "dropbox" as const;
  readonly capabilities: Capabilities = {
    maxFileBytes: null,
    hasFolders: true,
    hasVersions: true,
    atomicBatch: false,
    hashKind: "dropbox-sha256",
  };
  constructor(auth: Auth) {
    super(auth, ["api.dropboxapi.com", "content.dropboxapi.com"]);
  }

  private async rpc<T>(
    path: string,
    data: object | null,
    signal?: AbortSignal,
  ) {
    const response = await this.request(API + path, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  }

  private content(
    path: string,
    args: object,
    body?: Blob,
    signal?: AbortSignal,
  ) {
    return this.request(CONTENT + path, {
      method: "POST",
      signal,
      headers: {
        "Dropbox-API-Arg": header(args),
        ...(body ? { "Content-Type": "application/octet-stream" } : {}),
      },
      body,
    });
  }

  async listRoots(): Promise<Location[]> {
    const account = await this.rpc<{ account_id: string }>(
      "/users/get_current_account",
      null,
    );
    return [
      {
        id: this.id + ":" + account.account_id,
        provider: this.id,
        label: "Dropbox",
        root: ROOT,
      },
    ];
  }
  async list(ref: string, opts?: { signal?: AbortSignal }) {
    let page = await this.rpc<Page>(
      "/files/list_folder",
      { path: id(ref) },
      opts?.signal,
    );
    const rows = [...page.entries];
    const seen = new Set<string>();
    while (page.has_more) {
      if (seen.has(page.cursor)) throw new ProviderError("PROVIDER_DOWN");
      seen.add(page.cursor);
      page = await this.rpc<Page>(
        "/files/list_folder/continue",
        { cursor: page.cursor },
        opts?.signal,
      );
      rows.push(...page.entries);
    }
    return rows.filter((item) => item[".tag"] !== "deleted").map(entry);
  }

  private metadata(ref: string, signal?: AbortSignal) {
    return this.rpc<Item>("/files/get_metadata", { path: id(ref) }, signal);
  }
  async stat(ref: string) {
    return entry(await this.metadata(ref));
  }
  async read(
    ref: string,
    opts?: ReadOptions,
  ) {
    const path = opts?.version ? "rev:" + opts.version : id(ref);
    return readBody(
      await this.content("/files/download", { path }, undefined, opts?.signal),
      opts,
    );
  }

  async history(ref: string) {
    const data = await this.rpc<{ entries: Item[] }>("/files/list_revisions", {
      path: id(ref),
      mode: "id",
    });
    return data.entries.flatMap((item) =>
      item.rev
        ? [
            {
              id: item.rev,
              modified: item.server_modified ?? null,
              label: item.rev,
            },
          ]
        : [],
    );
  }

  async quota() {
    const data = await this.rpc<{
      used: number;
      allocation: { allocated: number };
    }>("/users/get_space_usage", null);
    return { used: data.used, total: data.allocation.allocated };
  }

  protected async write(c: Change, blob: Blob | undefined, ctx: PushContext) {
    const existing =
      c.op === "modify" || c.op === "delete" || c.op === "rename";
    const source = existing
      ? await this.metadata(c.ref, ctx.signal)
      : undefined;
    if (source && source.rev !== c.baseVersion)
      throw new ProviderError("CONFLICT");
    if (c.op === "delete") {
      await this.rpc(
        "/files/delete_v2",
        { path: id(c.ref), parent_rev: c.baseVersion },
        ctx.signal,
      );
      return;
    }
    const parent = c.parent ?? (existing ? undefined : c.ref);
    const parentPath =
      parent && parent !== ROOT
        ? (await this.metadata(parent, ctx.signal)).path_display
        : "";
    const path =
      c.op === "modify"
        ? source?.path_display
        : parentPath !== undefined
          ? parentPath + "/" + c.name
          : undefined;
    if (!path) throw new ProviderError("NOT_FOUND");
    if (c.op === "rename") {
      const result = await this.rpc<{ metadata: Item }>(
        "/files/move_v2",
        { from_path: id(c.ref), to_path: path, autorename: false },
        ctx.signal,
      );
      return entry(result.metadata);
    }
    if (c.op === "mkdir") {
      const result = await this.rpc<{ metadata: Item }>(
        "/files/create_folder_v2",
        { path, autorename: false },
        ctx.signal,
      );
      return entry(result.metadata);
    }
    if (!blob) throw new ProviderError("NOT_FOUND");
    const commit = {
      path,
      autorename: false,
      strict_conflict: true,
      mode:
        c.op === "modify" ? { ".tag": "update", update: c.baseVersion } : "add",
    };
    let response: Response;
    if (blob.size <= SINGLE_UPLOAD_BYTES) {
      response = await this.content("/files/upload", commit, blob, ctx.signal);
    } else {
      const start = await this.content(
        "/files/upload_session/start",
        { close: false },
        blob.slice(0, CHUNK_BYTES),
        ctx.signal,
      );
      const { session_id } = (await start.json()) as { session_id: string };
      let offset = CHUNK_BYTES;
      ctx.onProgress?.(c.id, offset, blob.size);
      while (offset + CHUNK_BYTES < blob.size) {
        await this.content(
          "/files/upload_session/append_v2",
          { cursor: { session_id, offset }, close: false },
          blob.slice(offset, offset + CHUNK_BYTES),
          ctx.signal,
        );
        offset += CHUNK_BYTES;
        ctx.onProgress?.(c.id, offset, blob.size);
      }
      response = await this.content(
        "/files/upload_session/finish",
        { cursor: { session_id, offset }, commit },
        blob.slice(offset),
        ctx.signal,
      );
    }
    const saved = entry((await response.json()) as Item);
    ctx.onProgress?.(c.id, blob.size, blob.size);
    return saved;
  }
}
