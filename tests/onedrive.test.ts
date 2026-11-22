import { createHash } from "node:crypto";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, it } from "vitest";
import { OneDriveProvider } from "../src/providers/onedrive/client";
import {
  quickXorHash,
  verifyOneDriveBytes,
} from "../src/providers/onedrive/hash";
import { sampleAuth } from "./cloud-fixture";
import { providerContract } from "./provider-contract";

const bytes = "sample reading bytes";
const download = "https://example.files.1drv.com/download";
providerContract("OneDrive", () => {
  let status = 0;
  let paged = false;
  let writes = 0;
  const api = "https://graph.microsoft.com/v1.0/me/drive";
  const file = {
    id: "notes",
    name: "reading-notes.txt",
    eTag: '"v1"',
    file: {
      hashes: { sha1Hash: createHash("sha1").update(bytes).digest("hex") },
    },
    "@microsoft.graph.downloadUrl": download,
  };
  const server = setupServer(
    http.get(download, ({ request }) =>
      request.headers.has("Authorization")
        ? HttpResponse.error()
        : new HttpResponse(bytes),
    ),
    http.all(api + "/*", ({ request }) => {
      if (status)
        return HttpResponse.json(
          {},
          { status, headers: { "Retry-After": "30" } },
        );
      const url = new URL(request.url);
      if (url.pathname.endsWith("/children")) {
        const next = url.searchParams.has("next");
        return HttpResponse.json({
          value: [next ? { ...file, id: "week2" } : file],
          ...(paged && !next
            ? { "@odata.nextLink": api + "/special/approot/children?next=1" }
            : {}),
        });
      }
      if (url.pathname.endsWith("/versions"))
        return HttpResponse.json({ value: [{ id: "1.0" }] });
      if (url.pathname.endsWith("/content") && request.method === "PUT") {
        writes++;
        return HttpResponse.json({ ...file, id: "new" });
      }
      return HttpResponse.json(file);
    }),
    http.get(api, () =>
      HttpResponse.json({ quota: { used: 20, total: 1_000_000_000 } }),
    ),
  );
  server.listen({ onUnhandledFrame: "error" });
  return {
    provider: new OneDriveProvider(sampleAuth),
    root: "od:app-root",
    file: "od:notes",
    reset() {
      status = 0;
    },
    error(value) {
      status = value;
    },
    pages() {
      paged = true;
    },
    writes: () => writes,
    dispose: () => server.close(),
  };
});

it("uses QuickXorHash's little-endian length and falls back to downloaded SHA-256", async () => {
  const file = new Blob([new Uint8Array([1, 2])]);
  expect(await quickXorHash(file)).toBe(
    Buffer.from([
      1, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0,
    ]).toString("base64"),
  );
  expect(
    await verifyOneDriveBytes(
      file,
      {},
      async () => new Blob([new Uint8Array([1, 2])]),
    ),
  ).toBe(true);
  expect(
    await verifyOneDriveBytes(
      file,
      {},
      async () => new Blob([new Uint8Array([2, 1])]),
    ),
  ).toBe(false);
});
