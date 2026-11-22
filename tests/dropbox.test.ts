import { createHash } from "node:crypto";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, it } from "vitest";
import { DropboxProvider } from "../src/providers/dropbox/client";
import { dropboxContentHash } from "../src/providers/dropbox/hash";
import { sampleAuth } from "./cloud-fixture";
import { providerContract } from "./provider-contract";

providerContract("Dropbox", () => {
  let status = 0;
  let paged = false;
  let writes = 0;
  const file = {
    ".tag": "file",
    id: "id:notes",
    name: "reading-notes.txt",
    path_display: "/reading-notes.txt",
    rev: "v1",
  };
  const server = setupServer(
    http.post("https://:host.dropboxapi.com/2/*", ({ request }) => {
      if (status)
        return HttpResponse.json(
          {},
          { status, headers: { "Retry-After": "30" } },
        );
      const path = new URL(request.url).pathname;
      if (path.endsWith("/list_folder"))
        return HttpResponse.json({
          entries: [file],
          cursor: "next",
          has_more: paged,
        });
      if (path.endsWith("/continue"))
        return HttpResponse.json({
          entries: [{ ...file, id: "id:week2" }],
          has_more: false,
        });
      if (path.endsWith("/download")) {
        const args = JSON.parse(
          request.headers.get("Dropbox-API-Arg") ?? "{}",
        ) as { path?: string };
        return ["id:notes", "rev:v1"].includes(args.path ?? "")
          ? new HttpResponse("sample reading bytes")
          : HttpResponse.error();
      }
      if (path.endsWith("/list_revisions"))
        return HttpResponse.json({ entries: [file] });
      if (path.endsWith("/get_space_usage"))
        return HttpResponse.json({
          used: 20,
          allocation: { allocated: 1_000_000_000 },
        });
      if (path.endsWith("/get_current_account"))
        return HttpResponse.json({ account_id: "mock-account" });
      if (path.endsWith("/get_metadata")) return HttpResponse.json(file);
      if (path.endsWith("/upload")) {
        writes++;
        return HttpResponse.json({ ...file, id: "id:new" });
      }
      return HttpResponse.error();
    }),
  );
  server.listen({ onUnhandledFrame: "error" });
  return {
    provider: new DropboxProvider(sampleAuth),
    root: "db:app-root",
    file: "db:id:notes",
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

it("computes Dropbox content hashes for generated multiblock and empty inputs", async () => {
  const block = new Uint8Array(4 * 1024 * 1024).fill(53);
  const tail = new Uint8Array([0, 127, 255]);
  const expected = createHash("sha256")
    .update(createHash("sha256").update(block).digest())
    .update(createHash("sha256").update(tail).digest())
    .digest("hex");
  expect(await dropboxContentHash(new Blob([block, tail]))).toBe(expected);
  expect(await dropboxContentHash(new Blob())).toBe(
    createHash("sha256").digest("hex"),
  );
});

it("starts, appends and commits a Dropbox session above 150 MiB", async () => {
  const calls: {
    path: string;
    args: { cursor?: { offset: number }; commit?: { path: string } };
  }[] = [];
  const server = setupServer(
    http.post("https://api.dropboxapi.com/2/files/list_folder", () =>
      HttpResponse.json({ entries: [], has_more: false }),
    ),
    http.post("https://api.dropboxapi.com/2/users/get_space_usage", () =>
      HttpResponse.json({ used: 0, allocation: { allocated: 1_000_000_000 } }),
    ),
    http.post(
      "https://content.dropboxapi.com/2/files/upload_session/*",
      ({ request }) => {
        const path = new URL(request.url).pathname.split("/").at(-1)!;
        const args = JSON.parse(
          request.headers.get("Dropbox-API-Arg")!,
        ) as (typeof calls)[number]["args"];
        calls.push({ path, args });
        if (path === "start")
          return HttpResponse.json({ session_id: "upload" });
        if (path === "finish")
          return HttpResponse.json({
            ".tag": "file",
            id: "id:large",
            name: "large.bin",
            rev: "v1",
          });
        return new HttpResponse(null);
      },
    ),
  );
  server.listen({ onUnhandledFrame: "error" });
  try {
    const chunk = new Blob([new Uint8Array(8 * 1048576)]);
    const blob = new Blob(Array<Blob>(19).fill(chunk));
    const adapter = new DropboxProvider(sampleAuth);
    await adapter.connect();
    expect(
      (
        await adapter.push(
          [
            {
              id: "large",
              op: "add",
              ref: "db:app-root",
              name: "large.bin",
              bytesKey: "blob",
            },
          ],
          { readBytes: async () => blob },
        )
      ).completed,
    ).toEqual(["large"]);
    expect(calls.map(({ path }) => path)).toEqual([
      "start",
      ...Array<string>(17).fill("append_v2"),
      "finish",
    ]);
    expect(calls[1].args.cursor?.offset).toBe(chunk.size);
    expect(calls.at(-1)?.args).toMatchObject({
      cursor: { offset: 18 * chunk.size },
      commit: { path: "/large.bin" },
    });
  } finally {
    server.close();
  }
});
