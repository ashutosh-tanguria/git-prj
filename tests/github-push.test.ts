import { afterAll, beforeAll, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { pushChanges, ConflictError } from "../src/services/githubPush";
import { evaluateFile } from "../src/services/guards";
import type { Change } from "../src/services/staging";
let collision = false,
  mode = "normal",
  refReads = 0;
const writes: { path: string; body: Record<string, unknown> }[] = [];
const server = setupServer(
  http.all("https://api.github.com/*", async ({ request }) => {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") {
      if (mode === "protected" && path.includes("/git/refs/"))
        return HttpResponse.json({}, { status: 403 });
      writes.push({
        path,
        body: (await request.json()) as Record<string, unknown>,
      });
      if (path.includes("/contents/"))
        return HttpResponse.json({ commit: { sha: "init" } });
      return HttpResponse.json({ sha: "next", object: { sha: "next" } });
    }
    if (path === "/user") return HttpResponse.json({ login: "ada", id: 42 });
    if (path.endsWith("/notes"))
      return HttpResponse.json({ size: 0, private: true });
    if (path.includes("/git/ref/") && mode === "empty" && refReads++ === 0)
      return HttpResponse.json({}, { status: 409 });
    if (path.includes("/git/ref/"))
      return HttpResponse.json({ object: { sha: "head" } });
    if (path.includes("/git/commits/"))
      return HttpResponse.json({ tree: { sha: "tree" } });
    return HttpResponse.json({
      tree: [
        { path: "old.txt", sha: "old", mode: "100644" },
        ...(collision
          ? [{ path: "a.txt", sha: "upstream", mode: "100644" }]
          : []),
      ],
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
const change = (path: string): Change => ({
  id: path,
  target: { owner: "ada", repo: "notes", branch: "main", path },
  kind: "add",
  blobKey: path,
  size: 1,
  createdAt: 0,
  verdict: evaluateFile(1),
});
const options = {
  message: "Add sample files",
  publicConfirmed: false,
  warningsConfirmed: false,
  sensitiveConfirmed: false,
};
it("makes three uploads and a deletion one atomic commit with force false", async () => {
  collision = false;
  writes.length = 0;
  const removed = {
    ...change("old.txt"),
    kind: "delete" as const,
    blobKey: undefined,
    baseVersion: "old",
  };
  await pushChanges(
    [change("a.txt"), change("b.txt"), change("c.txt"), removed],
    async () => new Blob(["x"]),
    options,
    async () => {},
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(1);
  expect(writes.at(-1)?.body.force).toBe(false);
  expect(
    (
      writes.find((w) => w.path.endsWith("/git/commits"))?.body.author as {
        email: string;
      }
    ).email,
  ).toBe("42+ada@users.noreply.github.com");
  expect(removed.kind).toBe("delete");
});
it("detects a colliding add before any mutation", async () => {
  collision = true;
  writes.length = 0;
  await expect(
    pushChanges(
      [change("a.txt")],
      async () => new Blob(["x"]),
      options,
      async () => {},
    ),
  ).rejects.toBeInstanceOf(ConflictError);
  expect(writes).toHaveLength(0);
});

it("reuses a rename blob without uploading bytes", async () => {
  collision = false;
  mode = "normal";
  writes.length = 0;
  await pushChanges(
    [
      {
        ...change("renamed.txt"),
        kind: "rename",
        oldPath: "old.txt",
        baseVersion: "old",
        blobKey: undefined,
      },
    ],
    async () => {
      throw Error("unexpected read");
    },
    options,
    async () => {},
  );
  expect(writes.some((w) => w.path.endsWith("/git/blobs"))).toBe(false);
});
it("initializes an empty repository explicitly", async () => {
  collision = false;
  mode = "empty";
  refReads = 0;
  writes.length = 0;
  const result = await pushChanges(
    [change("first.txt")],
    async () => new Blob(["x"]),
    options,
    async () => {},
  );
  expect(result).toEqual(["init"]);
  expect(writes[0].path).toContain("/contents/");
  mode = "normal";
});
it("retains the plan when a protected ref rejects the write", async () => {
  collision = false;
  mode = "protected";
  await expect(
    pushChanges(
      [change("a.txt")],
      async () => new Blob(["x"]),
      options,
      async () => {},
    ),
  ).rejects.toThrow("PERMISSION");
  mode = "normal";
});
it("honours cancellation before a mutation", async () => {
  collision = false;
  writes.length = 0;
  const abort = new AbortController();
  await expect(
    pushChanges(
      [change("a.txt")],
      async () => new Blob(["x"]),
      { ...options, signal: abort.signal },
      async () => {
        abort.abort();
      },
    ),
  ).rejects.toThrow();
  expect(writes).toHaveLength(0);
});

it("splits over-cap plans into sequential commits and schedules mutations", async () => {
  mode = "normal";
  collision = false;
  writes.length = 0;
  const delays: number[] = [];
  const fake = () =>
    ({
      size: 90 * 1048576,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    }) as Blob;
  await pushChanges(
    Array.from({ length: 6 }, (_, i) => change("sample-" + i + ".bin")),
    async () => fake(),
    { ...options, warningsConfirmed: true },
    async (ms) => {
      delays.push(ms);
    },
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(2);
  expect(delays.some((ms) => ms > 0)).toBe(true);
});
