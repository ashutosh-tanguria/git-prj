import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Auth } from "../src/providers/auth";
export const sampleAuth: Auth = {
  acquire: async () => ({
    value: "sample-cloud-token",
    expiresAt: Date.now() + 3600000,
  }),
  clear() {},
};
export function driveFixture() {
  let status = 0,
    paged = false,
    writes = 0,
    empty = false;
  const file = {
    id: "notes",
    name: "reading-notes.txt",
    size: "20",
    md5Checksum: "sample-md5",
    headRevisionId: "v1",
  };
  const ranges: string[] = [];
  let failure: { write: number; status: number } | undefined;
  const server = setupServer(
    http.all("https://www.googleapis.com/*", async ({ request }) => {
      const u = new URL(request.url),
        path = u.pathname;
      if (status)
        return HttpResponse.json(
          {},
          { status, headers: { "Retry-After": "30" } },
        );
      if (path.includes("/upload/")) {
        writes++;
        if (failure?.write === writes)
          return HttpResponse.json({}, { status: failure.status });
        if (u.searchParams.get("uploadType") === "resumable")
          return new HttpResponse(null, {
            headers: { Location: "https://www.googleapis.com/upload/session" },
          });
        const range = request.headers.get("Content-Range");
        if (range) {
          ranges.push(range);
          const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(range)!;
          if (+m[2] + 1 < +m[3])
            return new HttpResponse(null, {
              status: 308,
              headers: { Range: "bytes=0-" + m[2] },
            });
        }
        return HttpResponse.json({ ...file, id: "new", name: "new.txt" });
      }
      if (request.method !== "GET") {
        writes++;
        return HttpResponse.json({ id: "folder", name: "Shelf" });
      }
      if (path.endsWith("/about"))
        return HttpResponse.json({
          user: { permissionId: "mock-account" },
          storageQuota: { usage: "20", limit: "1000000000" },
        });
      if (u.searchParams.get("alt") === "media")
        return new HttpResponse("sample reading bytes");
      if (path.endsWith("/revisions"))
        return HttpResponse.json({
          revisions: [{ id: "v1", modifiedTime: "2026-11-20" }],
        });
      if (path.endsWith("/files")) {
        if (u.searchParams.get("q")?.includes("appProperties"))
          return HttpResponse.json({ files: empty ? [] : [{ id: "folder" }] });
        const second = u.searchParams.has("pageToken");
        return HttpResponse.json({
          files: [second ? { ...file, id: "week2", name: "week-2.txt" } : file],
          ...(paged && !second ? { nextPageToken: "second" } : {}),
        });
      }
      return HttpResponse.json(file, { headers: { ETag: "etag-v1" } });
    }),
  );
  server.listen({ onUnhandledFrame: "error" });
  return {
    failWrite(write: number, status: number) {
      failure = { write, status };
    },
    server,
    root: "gd:folder",
    file: "gd:notes",
    reset() {
      status = 0;
    },
    error(s: number) {
      status = s;
    },
    pages() {
      paged = true;
    },
    writes: () => writes,
    empty() {
      empty = true;
    },
    ranges,
    dispose() {
      server.close();
    },
  };
}
