import { http, HttpResponse, passthrough } from "msw";
import { network } from "virtual:msw";
import type { CloudId } from "../src/providers/types";
import { quickXorHash } from "../src/providers/onedrive/hash";

type Item = {
  id: string;
  name: string;
  parent: string;
  version: string;
  bytes?: Blob;
  trashed?: boolean;
  hash?: string;
};
const ROOT = "mock-root";
const items = (prefix: string): Item[] => [
  {
    id: prefix + "notes",
    name: "reading-notes.txt",
    parent: ROOT,
    version: "v1",
    bytes: new Blob(["Sample reading notes."]),
  },
  { id: prefix + "folder", name: "Coursework", parent: ROOT, version: "v1" },
];
const sets = { gdrive: items(""), dropbox: items("id:"), onedrive: items("") };
const quota = { used: 97_000_000, total: 100_000_000 };
const failures = new Set<string>();
const token = (id: CloudId) => "shelf-mock-" + id;

function authorized(request: Request, id: CloudId) {
  return request.headers.get("Authorization") === "Bearer " + token(id);
}
function error(status: number) {
  return HttpResponse.json(
    {},
    { status, headers: status === 429 ? { "Retry-After": "30" } : {} },
  );
}
function lookup(id: CloudId, ref: string | undefined) {
  return sets[id].find(
    (item) =>
      !item.trashed &&
      (item.id === ref ||
        "/" + item.name === ref ||
        "rev:" + item.version === ref),
  );
}
function list(id: CloudId, parent: string) {
  return sets[id].filter((item) => !item.trashed && item.parent === parent);
}
function upsert(
  id: CloudId,
  current: Item | undefined,
  name: string,
  parent: string,
  bytes?: Blob,
  createId?: string,
) {
  const item: Item = current ?? {
    id: createId ?? (id === "dropbox" ? "id:" : "") + crypto.randomUUID(),
    name,
    parent,
    version: "v1",
  };
  if (!current) sets[id].push(item);
  else item.version = "v" + (Number(item.version.slice(1)) + 1);
  Object.assign(item, { name, parent, ...(bytes ? { bytes } : {}) });
  return item;
}
function onceLimited(id: CloudId, name: string) {
  const key = id + name;
  if (name !== "fail-once.txt" || failures.has(key)) return false;
  failures.add(key);
  return true;
}
const folderMime = "application/vnd.google-apps.folder";
function google(item: Item) {
  return {
    id: item.id,
    name: item.name,
    headRevisionId: item.version,
    parents: [item.parent],
    size: item.bytes ? String(item.bytes.size) : undefined,
    mimeType: item.bytes ? "application/octet-stream" : folderMime,
  };
}
function dropbox(item: Item) {
  return {
    ".tag": item.bytes ? "file" : "folder",
    id: item.id,
    name: item.name,
    rev: item.bytes ? item.version : undefined,
    path_display: "/" + item.name,
    size: item.bytes?.size,
  };
}
const signed = "https://example.files.1drv.com/download/";
function graph(item: Item) {
  return {
    id: item.id,
    name: item.name,
    eTag: '"' + item.version + '"',
    size: item.bytes?.size,
    folder: item.bytes ? undefined : {},
    file: item.bytes
      ? { hashes: item.hash ? { quickXorHash: item.hash } : {} }
      : undefined,
    "@microsoft.graph.downloadUrl": signed + item.id,
  };
}
async function multipart(request: Request) {
  const contentType = request.headers.get("Content-Type") ?? "";
  const boundary = contentType.split("boundary=")[1];
  if (!boundary) throw new Error("Missing multipart boundary");
  const data = new Uint8Array(await request.arrayBuffer());
  const separator = new TextEncoder().encode("\r\n\r\n");
  const starts: number[] = [];
  for (
    let i = 0;
    i <= data.length - separator.length && starts.length < 2;
    i++
  ) {
    if (separator.every((byte, index) => data[i + index] === byte))
      starts.push(i);
  }
  const headerText = new TextDecoder().decode(
    data.slice(starts[0] + 4, starts[1]),
  );
  const metadata = JSON.parse(headerText.split("\r\n")[0]) as {
    id?: string;
    name: string;
    parents?: string[];
  };
  const body = new Blob([
    data.slice(starts[1] + 4, data.length - boundary.length - 6),
  ]);
  return { metadata, body };
}
const handlers = [
  http.get(location.origin + "/*", () => passthrough()),
  http.all("https://www.googleapis.com/*", async ({ request }) => {
    if (!authorized(request, "gdrive")) return error(401);
    const url = new URL(request.url);
    const ref = url.pathname.split("/files/")[1]?.split("/")[0];
    const item = lookup("gdrive", ref);
    if (url.pathname.endsWith("/about"))
      return HttpResponse.json({
        user: { permissionId: "mock-account" },
        storageQuota: { usage: String(quota.used), limit: String(quota.total) },
      });
    if (request.method === "GET") {
      if (url.pathname.endsWith("/generateIds")) return HttpResponse.json({ ids: [crypto.randomUUID()] });
      if (url.pathname.endsWith("/files")) {
        const query = url.searchParams.get("q") ?? "";
        if (query.includes("appProperties"))
          return HttpResponse.json({ files: [{ id: ROOT }] });
        return HttpResponse.json({
          files: list("gdrive", query.split("'")[1] || ROOT).map(google),
        });
      }
      if (!item) return error(404);
      if (url.searchParams.get("alt") === "media")
        return new HttpResponse(item.bytes);
      if (url.pathname.endsWith("/revisions"))
        return HttpResponse.json({ revisions: [{ id: item.version }] });
      return HttpResponse.json(google(item), {
        headers: { ETag: '"' + item.version + '"' },
      });
    }
    if (url.searchParams.get("uploadType") === "multipart") {
      const { metadata, body } = await multipart(request);
      const name = metadata.name ?? item?.name ?? "";
      if (onceLimited("gdrive", name)) return error(429);
      if (metadata.id && lookup("gdrive", metadata.id)) return error(409);
      return HttpResponse.json(
        google(
          upsert(
            "gdrive",
            item,
            name,
            metadata.parents?.[0] ?? item?.parent ?? ROOT,
            body,
            metadata.id,
          ),
        ),
      );
    }
    if (url.pathname.startsWith("/upload/")) return error(413);
    const data = (await request.json()) as {
      id?: string;
      name?: string;
      parents?: string[];
      trashed?: boolean;
    };
    if (data.trashed && item) {
      item.trashed = true;
      return HttpResponse.json(google(item));
    }
    if (data.id && lookup("gdrive", data.id)) return error(409);
    return HttpResponse.json(
      google(
        upsert(
          "gdrive",
          item,
          data.name ?? item?.name ?? "",
          url.searchParams.get("addParents") ??
            data.parents?.[0] ??
            item?.parent ??
            ROOT,
          undefined,
          data.id,
        ),
      ),
    );
  }),
  http.post("https://api.dropboxapi.com/2/*", async ({ request }) => {
    if (!authorized(request, "dropbox")) return error(401);
    const path = new URL(request.url).pathname;
    const data = (await request.json()) as {
      path?: string;
      from_path?: string;
      to_path?: string;
    } | null;
    const item = lookup("dropbox", data?.path ?? data?.from_path);
    if (path.endsWith("/get_current_account"))
      return HttpResponse.json({ account_id: "mock-account" });
    if (path.endsWith("/get_space_usage"))
      return HttpResponse.json({
        used: quota.used,
        allocation: { allocated: quota.total },
      });
    if (path.endsWith("/list_folder"))
      return HttpResponse.json({
        entries: list("dropbox", item?.id ?? ROOT).map(dropbox),
        cursor: "",
        has_more: false,
      });
    if (path.endsWith("/create_folder_v2"))
      return HttpResponse.json({
        metadata: dropbox(
          upsert(
            "dropbox",
            undefined,
            data?.path?.split("/").at(-1) ?? "",
            ROOT,
          ),
        ),
      });
    if (!item) return error(404);
    if (path.endsWith("/get_metadata")) return HttpResponse.json(dropbox(item));
    if (path.endsWith("/list_revisions"))
      return HttpResponse.json({ entries: [dropbox(item)] });
    if (path.endsWith("/delete_v2")) {
      item.trashed = true;
      return HttpResponse.json({ metadata: dropbox(item) });
    }
    if (path.endsWith("/move_v2"))
      return HttpResponse.json({
        metadata: dropbox(
          upsert(
            "dropbox",
            item,
            data?.to_path?.split("/").at(-1) ?? item.name,
            item.parent,
          ),
        ),
      });
    return error(400);
  }),
  http.post("https://content.dropboxapi.com/2/*", async ({ request }) => {
    if (!authorized(request, "dropbox")) return error(401);
    const path = new URL(request.url).pathname;
    const args = JSON.parse(request.headers.get("Dropbox-API-Arg") ?? "{}") as {
      path: string;
    };
    const item = lookup("dropbox", args.path);
    if (path.endsWith("/download"))
      return item ? new HttpResponse(item.bytes) : error(404);
    if (!path.endsWith("/upload")) return error(413);
    const name = args.path.split("/").at(-1) ?? "";
    if (onceLimited("dropbox", name)) return error(429);
    return HttpResponse.json(
      dropbox(
        upsert(
          "dropbox",
          item,
          name,
          item?.parent ?? ROOT,
          new Blob([await request.arrayBuffer()]),
        ),
      ),
    );
  }),
  http.all(
    "https://graph.microsoft.com/v1.0/me/drive*",
    async ({ request }) => {
      if (!authorized(request, "onedrive")) return error(401);
      const path = new URL(request.url).pathname.split("/drive")[1] ?? "";
      const ref = path.split("/items/")[1]?.split(/[:/]/)[0];
      const item = lookup("onedrive", ref);
      if (request.method === "GET") {
        if (!path) return HttpResponse.json({ quota });
        if (path.endsWith("/children"))
          return HttpResponse.json({
            value: list("onedrive", item?.id ?? ROOT).map(graph),
          });
        if (path.endsWith("/approot")) return HttpResponse.json({ id: ROOT });
        if (!item) return error(404);
        if (path.endsWith("/versions"))
          return HttpResponse.json({ value: [{ id: item.version }] });
        return HttpResponse.json(graph(item));
      }
      if (request.method === "DELETE" && item) {
        item.trashed = true;
        return new HttpResponse(null, { status: 204 });
      }
      if (request.method === "PUT") {
        const name = decodeURIComponent(
          path.split(":/")[1]?.split(":")[0] ?? item?.name ?? "",
        );
        if (onceLimited("onedrive", name)) return error(429);
        const bytes = new Blob([await request.arrayBuffer()]);
        const written = upsert(
          "onedrive",
          path.includes(":/") ? undefined : item,
          name,
          path.includes(":/") ? (item?.id ?? ROOT) : (item?.parent ?? ROOT),
          bytes,
        );
        written.hash = await quickXorHash(bytes);
        return HttpResponse.json(graph(written));
      }
      if (path.endsWith("/createUploadSession")) return error(413);
      const data = (await request.json()) as {
        name: string;
        parentReference?: { id: string };
      };
      return HttpResponse.json(
        graph(
          upsert(
            "onedrive",
            request.method === "PATCH" ? item : undefined,
            data.name,
            data.parentReference?.id ?? item?.parent ?? ROOT,
          ),
        ),
      );
    },
  ),
  http.get(signed + ":id", ({ params, request }) => {
    if (request.headers.has("Authorization")) return error(403);
    const item = lookup("onedrive", String(params.id));
    return item?.bytes ? new HttpResponse(item.bytes) : error(404);
  }),
];

let started: Promise<void> | undefined;
export async function providerMock(id: CloudId) {
  started ??= (async () => {
    network.configure({ handlers, onUnhandledFrame: "error" });
    await network.enable();
  })();
  await started;
  return {
    acquire: async () => ({
      value: token(id),
      expiresAt: Date.now() + 3600000,
    }),
    clear() {},
  };
}
