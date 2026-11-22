import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { DriveProvider } from "../src/providers/gdrive/client";
import { githubProvider } from "../src/providers/github/adapter";
import { createTransferJournal } from "../src/services/transferJournal";
import { hashTransferBlob } from "../src/services/transferHash";
import type {
  RunOptions,
  Transfer,
  TransferDraft,
  TransferStorage,
} from "../src/services/transferTypes";
import { GITHUB } from "../src/lib/limits";
import { sampleAuth } from "./cloud-fixture";

const folder = {
  provider: "gdrive",
  locationId: "gdrive:account",
  ref: "gd:folder",
} as const;
const git = {
  provider: "github",
  locationId: "ada/source",
  ref: "gh:ada/source@main/",
} as const;
const otherGit = {
  provider: "github",
  locationId: "ada/target",
  ref: "gh:ada/target@main/",
} as const;
const body = "Mock transfer bytes";
const driveHash = (await hashTransferBlob(new Blob([body]), ["md5"])).md5;
const gitHash = (await hashTransferBlob(new Blob([body]), ["git-sha1"]))[
  "git-sha1"
]!;
const gitChanges: string[] = [];
let targets: {
  id: string;
  name: string;
  version: string;
  bytes: string;
  hash?: string;
}[];
let tree: { path: string; sha: string | null; mode: string; size: number }[];
let nextTree: typeof tree;
let otherTree: typeof tree,
  nextOtherTree: typeof tree,
  loseDeleteResponse: boolean;
let reads: number,
  creates: number,
  corrupt: boolean,
  omitHash: boolean,
  loseResponse: boolean,
  failNext: boolean;
const missing = () => HttpResponse.json({}, { status: 404 });
const driveEntry = (target: (typeof targets)[number]) => ({
  id: target.id,
  name: target.name,
  headRevisionId: target.version,
  size: String(target.bytes.length),
  md5Checksum: target.hash,
});
const server = setupServer(
  http.all("https://api.github.com/*", async ({ request }) => {
    const path = new URL(request.url).pathname;
    const target = path.includes("/repos/ada/target");
    const currentTree = target ? otherTree : tree;
    if (path === "/user") return HttpResponse.json({ login: "ada", id: 1 });
    if (path.endsWith("/source") || path.endsWith("/target"))
      return HttpResponse.json({ size: 1, private: true });
    if (path.includes("/git/ref/"))
      return HttpResponse.json({ object: { sha: "head" } });
    if (path.includes("/git/commits/"))
      return HttpResponse.json({ tree: { sha: "tree" } });
    if (path.includes("/git/trees/"))
      return HttpResponse.json({ tree: currentTree, truncated: false });
    if (path.endsWith("/git/blobs")) {
      const { content } = (await request.json()) as { content: string };
      expect(atob(content)).toBe(body);
      return HttpResponse.json({ sha: gitHash });
    }
    if (path.includes("/git/blobs/")) {
      reads++;
      return path.endsWith(gitHash) ? new HttpResponse(body) : missing();
    }
    if (path.endsWith("/git/trees")) {
      const { tree: entries } = (await request.json()) as { tree: typeof tree };
      const next = currentTree
        .filter((item) => !entries.some((entry) => entry.path === item.path))
        .concat(
          entries
            .filter((entry) => entry.sha)
            .map((entry) => ({ ...entry, size: body.length })),
        );
      if (target) nextOtherTree = next;
      else nextTree = next;
      return HttpResponse.json({ sha: "next-tree" });
    }
    if (path.endsWith("/git/commits"))
      return HttpResponse.json({ sha: "next-commit" });
    if (path.includes("/git/refs/")) {
      expect(await request.json()).toMatchObject({ force: false });
      if (target) {
        otherTree = nextOtherTree;
        gitChanges.push("write");
      } else {
        tree = nextTree;
        gitChanges.push("delete");
        if (loseDeleteResponse) return HttpResponse.error();
      }
      return HttpResponse.json({ object: { sha: "next-commit" } });
    }
    return missing();
  }),
  http.all("https://www.googleapis.com/*", async ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.endsWith("/about"))
      return HttpResponse.json({
        storageQuota: { usage: "0", limit: "1000000000" },
      });
    if (path.endsWith("/generateIds"))
      return HttpResponse.json({ ids: [crypto.randomUUID()] });
    if (path.startsWith("/upload/")) {
      if (failNext) {
        failNext = false;
        return HttpResponse.json({}, { status: 413 });
      }
      const payload = await request.text();
      const metadata = JSON.parse(
        payload.split("\r\n\r\n")[1].split("\r\n")[0],
      ) as { id?: string; name: string };
      const existing = targets.find((item) => path.endsWith("/" + item.id));
      if (existing)
        expect(request.headers.get("If-Match")).toBe(existing.version);
      else creates++;
      const target = existing ?? {
        id: metadata.id!,
        name: metadata.name,
        version: "",
        bytes: "",
      };
      if (targets.some((item) => item !== existing && item.id === target.id))
        return HttpResponse.json({}, { status: 409 });
      target.version = crypto.randomUUID();
      target.hash = omitHash ? undefined : corrupt ? "0".repeat(32) : driveHash;
      target.bytes = corrupt ? "x".repeat(body.length) : body;
      if (!existing) targets.push(target);
      if (loseResponse) {
        loseResponse = false;
        return HttpResponse.error();
      }
      return HttpResponse.json(driveEntry(target));
    }
    if (path.endsWith("/files"))
      return HttpResponse.json({ files: targets.map(driveEntry) });
    const target = targets.find((entry) => path.endsWith("/" + entry.id));
    if (!target) return missing();
    if (url.searchParams.get("alt") === "media")
      return new HttpResponse(target.bytes);
    return HttpResponse.json(driveEntry(target), {
      headers: { ETag: target.version },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  gitChanges.length = 0;
  targets = [];
  tree = ["one.txt", "two.txt"].map((path) => ({
    path,
    sha: gitHash,
    mode: "100644",
    size: body.length,
  }));
  nextTree = otherTree = nextOtherTree = [];
  reads = creates = 0;
  corrupt = omitHash = loseResponse = failNext = loseDeleteResponse = false;
});

async function fixture() {
  let rows: Transfer[] = [];
  const bytes = new Map<string, Blob>();
  let stopAt: Transfer["state"] | undefined;
  let stopped = false;
  const storage: TransferStorage = {
    load: async () => structuredClone(rows),
    save: async (value) => {
      if (stopped) throw Error("simulated crash");
      rows = structuredClone(value);
      if (rows.some((row) => row.state === stopAt)) {
        stopped = true;
        throw Error("simulated crash");
      }
    },
    get: async (key) => {
      const blob = bytes.get(key);
      if (!blob) throw Error("workingMissing");
      return blob;
    },
    put: async (key, blob) => {
      bytes.set(key, blob);
    },
    remove: async (key) => {
      bytes.delete(key);
    },
    requestPersistence: async () => {},
    spool: async (key, response, size, progress) => {
      const blob = await response.blob();
      if (blob.size !== size) throw Error("transferSourceChanged");
      bytes.set(key, blob);
      progress(blob.size);
      return blob;
    },
  };
  const make = () =>
    createTransferJournal(
      storage,
      async (action) => action(),
      hashTransferBlob,
    );
  const github = githubProvider(
    async () => "mock",
    async () => {},
  );
  const drive = new DriveProvider(sampleAuth);
  await Promise.all([github.connect(), drive.connect()]);
  const options: RunOptions = {
    resolve: async (endpoint) =>
      endpoint.provider === "github" ? github : drive,
  };
  const draft = async (
    name = "one.txt",
    move = true,
  ): Promise<TransferDraft> => ({
    source: { endpoint: git, entry: await github.stat(git.ref + name) },
    target: folder,
    name,
    move,
  });
  return {
    make,
    draft,
    options,
    crash: (state: Transfer["state"]) => {
      stopAt = state;
    },
    reconnect: () => {
      stopped = false;
      stopAt = undefined;
      return make();
    },
  };
}

it("verifies the native hash before committing a recoverable GitHub delete", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  const states: Transfer["state"][] = [];
  await journal.run([row.id], {
    ...f.options,
    changed: (next) => {
      states.push(next.state);
      if (next.state === "verified") expect(gitChanges).toEqual([]);
    },
  });
  expect(states).toContain("verified");
  expect((await journal.load())[0].state).toBe("done");
  expect(gitChanges).toEqual(["delete"]);
  expect(targets[0].bytes).toBe(body);
  expect(reads).toBe(1);
});

it("keeps the source on a native hash mismatch and retries against the same target", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  corrupt = true;
  await journal.run([row.id], f.options);
  expect((await journal.load())[0]).toMatchObject({
    state: "failed",
    error: "transferNotVerified",
  });
  expect(gitChanges).toHaveLength(0);
  corrupt = false;
  await journal.run([row.id], f.options);
  expect((await journal.load())[0].state).toBe("done");
  expect(creates).toBe(1);
  expect(targets).toHaveLength(1);
});

it("keeps the source if the SHA-256 readback differs", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  omitHash = true;
  corrupt = true;
  await journal.run([row.id], f.options);
  expect((await journal.load())[0]).toMatchObject({
    state: "failed",
    error: "transferNotVerified",
  });
  expect(gitChanges).toHaveLength(0);
});

it.each([
  "reading",
  "writing",
  "verifying",
  "verified",
  "deleting",
  "done",
] as const)(
  "reopens an interrupted %s journal without repeating a completed write",
  async (state) => {
    const f = await fixture();
    const journal = f.make();
    const [row] = await journal.stage([{ draft: await f.draft() }]);
    f.crash(state);
    await expect(journal.run([row.id], f.options)).rejects.toThrow(
      "simulated crash",
    );
    const restarted = f.reconnect();
    await restarted.run([row.id], f.options);
    expect((await restarted.load())[0].state).toBe("done");
    expect(creates).toBe(1);
    expect(gitChanges).toHaveLength(1);
  },
);

it("reconciles a lost create response without duplicating the target", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  loseResponse = true;
  await journal.run([row.id], f.options);
  expect((await journal.load())[0]).toMatchObject({
    state: "failed",
    attempted: true,
  });
  expect(gitChanges).toHaveLength(0);
  const restarted = f.reconnect();
  await restarted.run([row.id], f.options);
  expect((await restarted.load())[0].state).toBe("done");
  expect(creates).toBe(1);
});

it("reconciles a lost delete response without replaying the delete", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  loseDeleteResponse = true;
  await journal.run([row.id], f.options);
  expect((await journal.load())[0]).toMatchObject({
    state: "failed",
    deleteAttempted: true,
  });
  const restarted = f.reconnect();
  await restarted.run([row.id], f.options);
  expect((await restarted.load())[0].state).toBe("done");
  expect(gitChanges).toEqual(["delete"]);
});

it("moves across repositories with separate atomic ref updates", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([
    { draft: { ...(await f.draft()), target: otherGit } },
  ]);
  await journal.run([row.id], f.options);
  expect((await journal.load())[0].state).toBe("done");
  expect(gitChanges).toEqual(["write", "delete"]);
  expect(otherTree[0]).toMatchObject({ path: "one.txt", sha: gitHash });
});

it("resumes a staged copy and verifies bytes if no native hash is provided", async () => {
  const f = await fixture();
  const [row] = await f
    .make()
    .stage([{ draft: await f.draft("one.txt", false) }]);
  omitHash = true;
  const restarted = f.reconnect();
  await restarted.run([row.id], f.options);
  expect((await restarted.load())[0].state).toBe("done");
  expect(targets[0].bytes).toBe(body);
  expect(gitChanges).toHaveLength(0);
});

it("honours cancellation after verification and leaves the source untouched after reload", async () => {
  const f = await fixture();
  const journal = f.make();
  const [row] = await journal.stage([{ draft: await f.draft() }]);
  let cancel: Promise<void> | undefined;
  await journal.run([row.id], {
    ...f.options,
    changed: (next) => {
      if (next.state === "verified") cancel = journal.cancel(row.id);
    },
  });
  await cancel;
  const restarted = f.reconnect();
  await restarted.run([row.id], f.options);
  expect((await restarted.load())[0].state).toBe("cancelled");
  expect(gitChanges).toHaveLength(0);
});

it("keeps only the failed source when another file in the same move succeeds", async () => {
  const f = await fixture();
  const journal = f.make();
  const rows = await journal.stage([
    { draft: await f.draft() },
    { draft: await f.draft("two.txt") },
  ]);
  failNext = true;
  await journal.run(
    rows.map((row) => row.id),
    f.options,
  );
  expect((await journal.load()).map((row) => row.state)).toEqual([
    "failed",
    "done",
  ]);
  expect(tree.map((entry) => entry.path)).toEqual(["one.txt"]);
});

it("blocks the GitHub 95 MiB boundary before reading the source", async () => {
  const f = await fixture();
  const journal = f.make();
  const draft = await f.draft();
  draft.source.entry.size = GITHUB.FILE_BLOCK_AT;
  draft.target = git;
  await expect(journal.stage([{ draft }])).rejects.toThrow("guardFileBlock");
  expect(reads).toBe(0);
  expect(await journal.load()).toEqual([]);
});

it("uses the native algorithms over more than one Dropbox block", async () => {
  const bytes = new Blob([new Uint8Array(4 * 1024 * 1024 + 1).fill(7)]);
  const { dropboxContentHash } = await import("../src/providers/dropbox/hash");
  const { quickXorHash } = await import("../src/providers/onedrive/hash");
  const expected = await hashTransferBlob(bytes, [
    "dropbox-sha256",
    "quickxor",
    "sha1",
    "sha256",
    "md5",
    "git-sha1",
  ]);
  expect(expected["dropbox-sha256"]).toBe(await dropboxContentHash(bytes));
  expect(expected.quickxor).toBe(await quickXorHash(bytes));
  const abc = await hashTransferBlob(new Blob(["abc"]), [
    "md5",
    "sha1",
    "git-sha1",
  ]);
  expect(abc).toEqual({
    md5: "900150983cd24fb0d6963f7d28e17f72",
    sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
    "git-sha1": "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f",
  });
});
