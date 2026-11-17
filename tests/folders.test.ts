import { retargetAdds } from "../src/services/retarget";
import { filterLinkedChanges } from "../src/services/groupedChanges";
import "../src/i18n";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  planEntries,
  planFolderUpload,
} from "../src/services/folderOperations";
import { FolderCollision } from "../src/services/folderTypes";
import { staging } from "../src/services/workingStorage";
import { stageOperation, checkOperation } from "../src/services/stageOperation";
import { pushChanges, ConflictError } from "../src/services/githubPush";
import { completeTree, type GitNode } from "../src/services/githubTree";
import { directoryFiles, droppedFiles } from "../src/services/folderUpload";
import { evaluateBatch } from "../src/services/guards";
import { en, hi } from "../src/i18n/m3c";
vi.mock("../src/services/workingStorage", async () => {
  const { createStaging } = await import("../src/services/staging");
  let rows: import("../src/services/staging").Change[] = [];
  const blobs = new Map<string, Blob>();
  return {
    staging: createStaging({
      load: async () => rows,
      save: async (value) => {
        rows = value;
      },
      put: async (id, blob) => {
        blobs.set(id, blob);
      },
      get: async (id) => blobs.get(id)!,
    }),
  };
});
const leaf = (path: string, sha = path): GitNode => ({
  path,
  sha,
  mode: "100644",
  type: "blob",
  size: 2,
});
const src: GitNode[] = [
  leaf("a.pdf", "a"),
  leaf("b.txt", "b"),
  { path: "nested", sha: "sub", mode: "040000", type: "tree" },
  leaf("nested/c.txt", "c"),
];
const source = { owner: "ada", repo: "notes", branch: "main", path: "" };
const entry = {
  name: "source",
  path: "source",
  ref: "gh:ada/notes@main/source",
  sha: "src",
  size: 0,
  kind: "dir" as const,
};
const approval = {
  publicConfirmed: false,
  warningsConfirmed: false,
  sensitiveConfirmed: false,
};
let truncated = false,
  incomplete = false,
  collide = false,
  sourceChanged = false,
  huge = false,
  blobReads = 0;
const writes: { path: string; body: Record<string, unknown> }[] = [];
const rootTree = (): GitNode[] => [
  {
    path: "source",
    sha: sourceChanged ? "changed" : "src",
    mode: "040000",
    type: "tree",
  },
  ...src.map((n) => ({ ...n, path: "source/" + n.path })),
  ...(collide
    ? [
        { path: "target", sha: "dest", mode: "040000", type: "tree" },
        leaf("target/a.pdf", "previous"),
        leaf("target/old.txt", "old"),
      ]
    : []),
];
const server = setupServer(
  http.all("https://api.github.com/*", async ({ request }) => {
    const url = new URL(request.url),
      path = url.pathname;
    if (request.method !== "GET") {
      writes.push({
        path,
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ sha: "next" });
    }
    if (path === "/user") return HttpResponse.json({ login: "ada", id: 1 });
    if (/^\/repos\/ada\/[^/]+$/.test(path))
      return HttpResponse.json({
        full_name: "ada/notes",
        size: 0,
        private: true,
        default_branch: "main",
      });
    if (path.includes("/git/ref/"))
      return HttpResponse.json({ object: { sha: "head" } });
    if (path.includes("/git/commits/"))
      return HttpResponse.json({
        tree: { sha: path.includes("/other/") ? "other-root" : "root" },
      });
    if (path.includes("/git/blobs/")) {
      blobReads++;
      return new HttpResponse("xx");
    }
    if (path.endsWith("/git/trees/root"))
      return HttpResponse.json({
        sha: "root",
        tree: rootTree(),
        truncated: false,
      });
    if (path.endsWith("/git/trees/other-root"))
      return HttpResponse.json({ sha: "other-root", tree: [] });
    if (path.endsWith("/git/trees/src")) {
      if (truncated && url.searchParams.has("recursive"))
        return HttpResponse.json({
          sha: "src",
          tree: [src[0]],
          truncated: true,
        });
      return HttpResponse.json({
        sha: "src",
        tree: (truncated ? src.filter((n) => !n.path.includes("/")) : src).map(
          (n) =>
            huge && n.mode !== "040000" ? { ...n, size: 95 * 1048576 } : n,
        ),
        truncated: incomplete,
      });
    }
    if (path.endsWith("/git/trees/sub"))
      return HttpResponse.json({ tree: [leaf("c.txt", "c")] });
    return HttpResponse.json({}, { status: 404 });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(async () => {
  truncated = incomplete = collide = sourceChanged = huge = false;
  blobReads = 0;
  writes.length = 0;
  await staging.restore([]);
});
it("renames three folder files as one durable group, one commit and zero blobs", async () => {
  const plan = await planEntries([entry], source, true, undefined, "renamed");
  expect(plan.changes.map((c) => c.target.path)).toEqual([
    "renamed/a.pdf",
    "renamed/b.txt",
    "renamed/nested/c.txt",
  ]);
  expect(new Set(plan.changes.map((c) => c.groupId)).size).toBe(1);
  await stageOperation(plan, approval);
  expect(staging.snapshot()).toHaveLength(3);
  await staging.undo();
  expect(staging.snapshot()).toHaveLength(0);
  await staging.redo();
  expect(staging.snapshot()).toHaveLength(3);
  await pushChanges(
    staging.snapshot(),
    staging.read,
    { ...approval, message: "Rename folder" },
    async () => {},
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(1);
  expect(writes.filter((w) => w.path.endsWith("/git/blobs"))).toHaveLength(0);
  const tree = writes.find((w) => w.path.endsWith("/git/trees"))!.body.tree as {
    path: string;
    sha: string | null;
  }[];
  expect(tree.filter((n) => n.sha === null)).toHaveLength(3);
  expect(tree.filter((n) => n.sha)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "renamed/nested/c.txt", sha: "c" }),
    ]),
  );
});
it("deletes every folder file and detects added upstream files through the tree SHA", async () => {
  const plan = await planEntries(
    [entry],
    source,
    true,
    undefined,
    undefined,
    true,
  );
  expect(plan.changes).toHaveLength(3);
  expect(plan.changes.every((c) => c.kind === "delete")).toBe(true);
  sourceChanged = true;
  await expect(
    pushChanges(
      plan.changes,
      staging.read,
      { ...approval, message: "Delete folder" },
      async () => {},
    ),
  ).rejects.toBeInstanceOf(ConflictError);
  expect(writes).toHaveLength(0);
  sourceChanged = false;
  await pushChanges(
    plan.changes,
    staging.read,
    { ...approval, message: "Delete folder" },
    async () => {},
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(1);
});
it("moves by SHA and copies within a repository without reading file bytes", async () => {
  const moved = await planEntries(
    [entry],
    { ...source, path: "archive" },
    true,
  );
  expect(
    moved.changes.every((c) => c.kind === "rename" && !c.blob && !c.readFrom),
  ).toBe(true);
  const copied = await planEntries(
    [entry],
    { ...source, path: "archive" },
    false,
  );
  expect(copied.changes.map((c) => c.blobSha)).toEqual(["a", "b", "c"]);
  await stageOperation(copied, approval);
  await pushChanges(
    staging.snapshot(),
    staging.read,
    { ...approval, message: "Copy folder" },
    async () => {},
  );
  expect(blobReads).toBe(0);
  expect(writes.some((w) => w.path.endsWith("/git/blobs"))).toBe(false);
});
it("cross-repository folder copy guards metadata before reading immutable bytes", async () => {
  const target = { ...source, repo: "other" };
  huge = true;
  const blocked = await planEntries([entry], target, false);
  await expect(stageOperation(blocked, approval)).rejects.toThrow(
    "guardFileBlock",
  );
  expect(blobReads).toBe(0);
  expect(staging.snapshot()).toHaveLength(0);
  huge = false;
  const plan = await planEntries([entry], target, false);
  expect(blobReads).toBe(0);
  await stageOperation(plan, approval);
  expect(blobReads).toBe(3);
  expect(staging.snapshot()).toHaveLength(3);
  expect(await staging.read(staging.snapshot()[0]).then((b) => b.text())).toBe(
    "xx",
  );
  await expect(planEntries([entry], target, true)).rejects.toThrow(
    "clipboardCrossRepository",
  );
  const sizes = Array(7).fill(80 * 1048576) as number[];
  expect(evaluateBatch(sizes).batches).toHaveLength(2);
  expect(() =>
    checkOperation(
      plan.changes.map((c) => ({ ...c, size: 70 * 1048576 })),
      {
        full_name: "ada/other",
        default_branch: "main",
        size: 0,
        private: true,
      },
      approval,
    ),
  ).toThrow("guardFileWarn");
});
it("falls back from a truncated recursive tree and fails closed on incomplete folder responses", async () => {
  truncated = true;
  const plan = await planEntries([entry], source, true, undefined, "renamed");
  expect(plan.fallback).toBe(true);
  expect(plan.changes).toHaveLength(3);
  incomplete = true;
  await expect(completeTree("/repos/ada/notes", "src")).rejects.toThrow(
    "folderIncomplete",
  );
  expect(staging.snapshot()).toHaveLength(0);
});
it("requires a collision choice and supports sibling suffix or explicit subtree replacement", async () => {
  collide = true;
  await expect(
    planEntries([entry], source, true, undefined, "target"),
  ).rejects.toBeInstanceOf(FolderCollision);
  const both = await planEntries([entry], source, true, "both", "target");
  expect(both.changes[0].target.path).toBe("target (shelf copy)/a.pdf");
  const replace = await planEntries([entry], source, true, "replace", "target");
  expect(
    replace.changes.find((c) => c.target.path === "target/old.txt")?.kind,
  ).toBe("delete");
  expect(
    replace.changes.find((c) => c.target.path === "target/a.pdf")
      ?.replaceVersion,
  ).toBe("previous");
  await pushChanges(
    replace.changes,
    staging.read,
    { ...approval, message: "Replace folder" },
    async () => {},
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(1);
});
it("rejects directory imports beyond 2,000 files before listing or staging", async () => {
  const files = Array.from(
    { length: 2001 },
    (_, i) => new File(["x"], i + ".txt"),
  );
  expect(() => directoryFiles(files)).toThrow("folderUploadCap");
  expect(() =>
    planFolderUpload(
      source,
      files.map((blob) => ({ path: "folder/" + blob.name, blob })),
    ),
  ).toThrow("folderUploadCap");
  expect(staging.snapshot()).toHaveLength(0);
});
it("preserves upload prefixes and drains every directory-reader batch including empty directories", async () => {
  let page = 0;
  const file = {
    name: "a.txt",
    isFile: true,
    isDirectory: false,
    file: (ok: (file: File) => void) => ok(new File(["xx"], "a.txt")),
  };
  const empty = {
    name: "empty",
    isFile: false,
    isDirectory: true,
    createReader: () => ({
      readEntries: (ok: (entries: unknown[]) => void) => ok([]),
    }),
  };
  const directory = {
    name: "sample-upload",
    isDirectory: true,
    isFile: false,
    createReader: () => ({
      readEntries: (ok: (entries: unknown[]) => void) =>
        ok(page++ === 0 ? [file] : page === 2 ? [empty] : []),
    }),
  };
  const data = {
    items: [{ kind: "file", webkitGetAsEntry: () => directory }],
    files: [],
  } as unknown as DataTransfer;
  const result = await droppedFiles(data);
  expect(result.items.map((i) => i.path)).toEqual([
    "sample-upload/a.txt",
    "sample-upload/empty/.gitkeep",
  ]);
  const plan = await planFolderUpload(
    { ...source, repo: "other", path: "notes" },
    result.items,
  );
  expect(plan.changes.map((c) => c.target.path)).toEqual([
    "notes/sample-upload/a.txt",
    "notes/sample-upload/empty/.gitkeep",
  ]);
  await stageOperation(plan, approval);
  expect(staging.snapshot()).toHaveLength(2);
});
it("keeps M3c locale keys in parity", () =>
  expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort()));

it("retains nested paths when an add-only folder group is retargeted", async () => {
  const plan = await planEntries(
    [entry],
    { ...source, path: "archive" },
    false,
  );
  const rows = retargetAdds(plan.changes, { ...source, path: "semester-6" });
  expect(rows.map((c) => c.target.path)).toEqual([
    "semester-6/source/a.pdf",
    "semester-6/source/b.txt",
    "semester-6/source/nested/c.txt",
  ]);
  expect(() =>
    retargetAdds(plan.changes, { ...source, repo: "other" }),
  ).toThrow("folderRetargetReuse");
});
it("keeps replacement groups intact under Pending filters and replacement undo", async () => {
  collide = true;
  const plan = await planEntries([entry], source, true, "replace", "target");
  expect(filterLinkedChanges(plan.changes, "delete")).toHaveLength(
    plan.changes.length,
  );
  await stageOperation(plan, approval);
  await staging.undo();
  expect(staging.snapshot()).toHaveLength(0);
});
it("does not publish a partial group if a later immutable blob cannot be read", async () => {
  server.use(
    http.get("https://api.github.com/repos/ada/notes/git/blobs/c", () =>
      HttpResponse.json({}, { status: 403 }),
    ),
  );
  const plan = await planEntries([entry], { ...source, repo: "other" }, false);
  await expect(stageOperation(plan, approval)).rejects.toThrow("PERMISSION");
  expect(staging.snapshot()).toHaveLength(0);
  server.resetHandlers();
});
it("preserves explicit empty Git trees with a disclosed marker and tree removal", async () => {
  server.use(
    http.get("https://api.github.com/repos/ada/notes/git/trees/src", () =>
      HttpResponse.json({ sha: "src", tree: [] }),
    ),
  );
  const plan = await planEntries(
    [entry],
    source,
    true,
    undefined,
    "empty-renamed",
  );
  expect(
    plan.changes.some((c) => c.treeDelete && c.target.path === "source"),
  ).toBe(true);
  expect(
    plan.changes.find((c) => c.target.path === "empty-renamed/.gitkeep")?.blob
      ?.size,
  ).toBe(0);
  server.resetHandlers();
});

it("uses the per-folder fallback again at push without omitting a path", async () => {
  truncated = true;
  server.use(
    http.get(
      "https://api.github.com/repos/ada/notes/git/trees/root",
      ({ request }) =>
        HttpResponse.json({
          sha: "root",
          tree: [{ path: "source", sha: "src", mode: "040000", type: "tree" }],
          truncated: new URL(request.url).searchParams.has("recursive"),
        }),
    ),
  );
  const plan = await planEntries([entry], source, true, undefined, "renamed");
  await pushChanges(
    plan.changes,
    staging.read,
    { ...approval, message: "Rename complete subtree" },
    async () => {},
  );
  const tree = writes.find((w) => w.path.endsWith("/git/trees"))!.body.tree as {
    path: string;
  }[];
  expect(tree).toHaveLength(6);
  expect(tree.map((n) => n.path)).toContain("renamed/nested/c.txt");
  server.resetHandlers();
});
it("splits a large replacement copy while retaining its destination tree guard", async () => {
  collide = true;
  const large = Array.from({ length: 6 }, (_, i) => ({
    ...leaf("sample-" + i + ".bin", "large-" + i),
    size: 90 * 1048576,
  }));
  const tree = () => [
    { path: "source", sha: "src", mode: "040000", type: "tree" },
    ...large.map((n) => ({ ...n, path: "source/" + n.path })),
    {
      path: "target",
      sha: writes.some((w) => w.path.includes("/git/refs/")) ? "after" : "dest",
      mode: "040000",
      type: "tree",
    },
    leaf("target/obsolete.txt", "obsolete"),
  ];
  server.use(
    http.get("https://api.github.com/repos/ada/notes/git/trees/src", () =>
      HttpResponse.json({ tree: large }),
    ),
    http.get("https://api.github.com/repos/ada/notes/git/trees/root", () =>
      HttpResponse.json({ tree: tree() }),
    ),
    http.get("https://api.github.com/repos/ada/notes/git/trees/next", () =>
      HttpResponse.json({ tree: tree() }),
    ),
  );
  const plan = await planEntries([entry], source, false, "replace", "target");
  const changes = plan.changes.map((c) =>
    c.kind === "delete" ? c : { ...c, blobSha: undefined, blobKey: c.id },
  );
  // Simulated blob lengths exercise commit planning without allocating 540 MiB.
  await pushChanges(
    changes,
    async () =>
      ({
        size: 90 * 1048576,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      }) as Blob,
    { ...approval, warningsConfirmed: true, message: "Copy large folder" },
    async () => {},
  );
  expect(writes.filter((w) => w.path.endsWith("/git/commits"))).toHaveLength(2);
  server.resetHandlers();
});

it("warns on case-only folder changes without normalizing or dropping file paths", async () => {
  const plan = await planEntries([entry], source, true, undefined, "Source");
  expect(plan.caseWarning).toBe(true);
  expect(plan.changes[0].target.path).toBe("Source/a.pdf");
});
it("refuses cross-repository LFS pointer copies without publishing a group", async () => {
  server.use(
    http.get(
      "https://api.github.com/repos/ada/notes/git/blobs/a",
      () =>
        new HttpResponse(
          "version https://git-lfs.github.com/spec/v1\noid sha256:sample\nsize 123\n",
        ),
    ),
  );
  const plan = await planEntries([entry], { ...source, repo: "other" }, false);
  await expect(stageOperation(plan, approval)).rejects.toThrow("folderLfs");
  expect(staging.snapshot()).toHaveLength(0);
  server.resetHandlers();
});
