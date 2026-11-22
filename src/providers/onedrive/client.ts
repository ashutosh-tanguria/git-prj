import type { Auth } from "../auth";
import { providerFetch, readResponse } from "../http";
import { SequentialProvider } from "../sequential";
import {
  ProviderError,
  type Capabilities,
  type Change,
  type Entry,
  type Location,
  type PushContext,
} from "../types";
import { verifyOneDriveBytes, type OneDriveHashes } from "./hash";
import { ONE_DRIVE_DOWNLOAD_SUFFIX, ONE_DRIVE_UPLOAD_SUFFIX } from "./hosts";

const GRAPH_HOST = "graph.microsoft.com";
const API = "https://" + GRAPH_HOST + "/v1.0/me/drive";
const ROOT = "od:app-root";
const SIMPLE_BYTES = 4_000_000;
const FRAGMENT_BYTES = 16 * 320 * 1024;
interface Item {
  id: string;
  name: string;
  eTag?: string;
  lastModifiedDateTime?: string;
  size?: number;
  folder?: object;
  file?: { hashes?: OneDriveHashes };
  "@microsoft.graph.downloadUrl"?: string;
}
interface Page<T> {
  value: T[];
  "@odata.nextLink"?: string;
}
function entry(item: Item): Entry {
  return {
    ref: "od:" + item.id,
    name: item.name,
    kind: item.folder ? "dir" : "file",
    size: item.folder ? null : (item.size ?? null),
    modified: item.lastModifiedDateTime ?? null,
    hash:
      item.file?.hashes?.sha1Hash ?? item.file?.hashes?.quickXorHash ?? null,
    version: item.eTag ?? null,
  };
}
function itemUrl(ref: string) {
  if (ref === ROOT) return API + "/special/approot";
  if (!/^od:[^/]+$/.test(ref)) throw new ProviderError("PERMISSION");
  return API + "/items/" + encodeURIComponent(ref.slice(3));
}
function preauthenticated(url: string, suffix: string, init: RequestInit) {
  const { hostname } = new URL(url);
  if (!hostname.endsWith(suffix) || hostname.length === suffix.length)
    throw new ProviderError("PERMISSION");
  return providerFetch(url, [hostname], init);
}

export class OneDriveProvider extends SequentialProvider {
  readonly id = "onedrive" as const;
  readonly capabilities: Capabilities = {
    maxFileBytes: null,
    hasFolders: true,
    hasVersions: true,
    atomicBatch: false,
    hashKind: "quickxor",
  };
  constructor(auth: Auth) {
    super(auth, [GRAPH_HOST]);
  }
  private async json<T>(url: string, init?: RequestInit) {
    return (await this.request(url, init)).json() as Promise<T>;
  }
  private async pages<T>(start: string, signal?: AbortSignal) {
    const rows: T[] = [];
    const seen = new Set<string>();
    let url: string | undefined = start;
    while (url) {
      if (seen.has(url) || !url.startsWith(API + "/"))
        throw new ProviderError("PROVIDER_DOWN");
      seen.add(url);
      const page: Page<T> = await this.json(url, { signal });
      rows.push(...page.value);
      url = page["@odata.nextLink"];
    }
    return rows;
  }
  async listRoots(): Promise<Location[]> {
    return [{ id: this.id, provider: this.id, label: "OneDrive", root: ROOT }];
  }
  async list(ref: string, opts?: { signal?: AbortSignal }) {
    return (
      await this.pages<Item>(itemUrl(ref) + "/children", opts?.signal)
    ).map(entry);
  }
  async stat(ref: string) {
    return entry(await this.json<Item>(itemUrl(ref)));
  }
  async read(
    ref: string,
    opts?: {
      signal?: AbortSignal;
      onProgress?(n: number, total: number): void;
      version?: string;
    },
  ) {
    const url =
      itemUrl(ref) +
      (opts?.version ? "/versions/" + encodeURIComponent(opts.version) : "");
    const item = await this.json<Item>(
      url + "?$select=id,@microsoft.graph.downloadUrl",
      { signal: opts?.signal },
    );
    const signed = item["@microsoft.graph.downloadUrl"];
    if (!signed) throw new ProviderError("PROVIDER_DOWN");
    return readResponse(
      await preauthenticated(signed, ONE_DRIVE_DOWNLOAD_SUFFIX, {
        signal: opts?.signal,
      }),
      opts?.onProgress,
      opts?.signal,
    );
  }
  async history(ref: string) {
    const versions = await this.pages<{
      id: string;
      lastModifiedDateTime?: string;
    }>(itemUrl(ref) + "/versions");
    return versions.map((version) => ({
      id: version.id,
      label: version.id,
      modified: version.lastModifiedDateTime ?? null,
    }));
  }
  async quota() {
    try {
      const { quota } = await this.json<{
        quota?: { used?: number; total?: number };
      }>(API + "?$select=quota");
      return quota?.used !== undefined && quota.total !== undefined
        ? { used: quota.used, total: quota.total }
        : null;
    } catch (error) {
      if (error instanceof ProviderError && error.code === "PERMISSION")
        return null;
      throw error;
    }
  }
  protected async write(c: Change, blob: Blob | undefined, ctx: PushContext) {
    const parent = itemUrl(c.parent ?? c.ref);
    const signal = ctx.signal;
    const conditions = c.baseVersion
      ? { "If-Match": c.baseVersion }
      : undefined;
    const conflictKey = "@microsoft.graph.conflictBehavior";
    const source = itemUrl(c.ref);
    if (c.op === "delete") {
      await this.request(source, {
        method: "DELETE",
        headers: conditions,
        signal,
      });
      return;
    }
    if (c.op === "rename" || c.op === "mkdir") {
      const destination =
        c.op === "rename" && c.parent
          ? await this.json<Item>(parent + "?$select=id", { signal })
          : undefined;
      const body =
        c.op === "mkdir"
          ? { name: c.name, folder: {}, [conflictKey]: "fail" }
          : {
              name: c.name,
              ...(destination
                ? { parentReference: { id: destination.id } }
                : {}),
            };
      return entry(
        await this.json<Item>(
          c.op === "mkdir" ? parent + "/children" : source,
          {
            method: c.op === "mkdir" ? "POST" : "PATCH",
            headers: { ...conditions, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          },
        ),
      );
    }
    if (!blob) throw new ProviderError("NOT_FOUND");
    const path =
      c.op === "modify"
        ? source
        : parent + ":/" + encodeURIComponent(c.name ?? "") + ":";
    let item: Item;
    if (blob.size <= SIMPLE_BYTES) {
      item = await this.json<Item>(
        path + "/content" + (c.op === "add" ? "?" + conflictKey + "=fail" : ""),
        {
          method: "PUT",
          headers: {
            ...conditions,
            "Content-Type": "application/octet-stream",
            ...(c.op === "add" ? { "If-None-Match": "*" } : {}),
          },
          body: blob,
          signal,
        },
      );
    } else {
      const { uploadUrl } = await this.json<{ uploadUrl: string }>(
        path + "/createUploadSession",
        {
          method: "POST",
          headers: { ...conditions, "Content-Type": "application/json" },
          body: JSON.stringify({
            item: { [conflictKey]: c.op === "add" ? "fail" : "replace" },
          }),
          signal,
        },
      );
      item = await this.uploadFragments(uploadUrl, blob, c, ctx);
    }
    const saved = entry(item);
    if (
      !(await verifyOneDriveBytes(blob, item.file?.hashes ?? {}, () =>
        this.read(saved.ref, { signal }),
      ))
    ) {
      throw new ProviderError("CONFLICT", false, { uncertain: true });
    }
    ctx.onProgress?.(c.id, blob.size, blob.size);
    return saved;
  }
  private async uploadFragments(
    url: string,
    blob: Blob,
    c: Change,
    ctx: PushContext,
  ) {
    for (let start = 0; start < blob.size; start += FRAGMENT_BYTES) {
      const end = Math.min(start + FRAGMENT_BYTES, blob.size);
      const response = await preauthenticated(url, ONE_DRIVE_UPLOAD_SUFFIX, {
        method: "PUT",
        headers: { "Content-Range": `bytes ${start}-${end - 1}/${blob.size}` },
        body: blob.slice(start, end),
        signal: ctx.signal,
      });
      if (response.status === 200 || response.status === 201) {
        if (end !== blob.size) throw new ProviderError("PROVIDER_DOWN");
        return (await response.json()) as Item;
      }
      const { nextExpectedRanges } = (await response.json()) as {
        nextExpectedRanges?: string[];
      };
      if (
        response.status !== 202 ||
        nextExpectedRanges?.[0]?.split("-")[0] !== String(end)
      ) {
        throw new ProviderError("CONFLICT", false, { uncertain: true });
      }
      ctx.onProgress?.(c.id, end, blob.size);
    }
    throw new ProviderError("PROVIDER_DOWN");
  }
}
