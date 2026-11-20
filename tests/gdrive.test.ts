import { expect, it } from "vitest";
import { DriveProvider } from "../src/providers/gdrive/client";
import { driveFixture, sampleAuth } from "./cloud-fixture";
import { providerContract } from "./provider-contract";
providerContract("Google Drive", () => ({ ...driveFixture(), provider: new DriveProvider(sampleAuth) }));
it("uses resumable above 5 MiB, reports ranges and retains MD5 metadata", async () => {
  const f = driveFixture(), p = new DriveProvider(sampleAuth);
  try {
    await p.connect(); const progress: number[] = [];
    const result = await p.push([{ id: "large", op: "add", ref: f.root, parent: f.root, name: "large.bin", bytesKey: "large" }], { readBytes: async () => new Blob([new Uint8Array(9 * 1048576)]), onProgress: (_, n) => { progress.push(n); } });
    expect(result.failed).toBeUndefined(); expect(f.ranges).toEqual(["bytes 0-8388607/9437184", "bytes 8388608-9437183/9437184"]);
    expect(progress).toEqual([8388608, 9437184]); expect((await p.stat(f.file)).hash).toBe("sample-md5");
  } finally { f.dispose(); }
});
it("creates the normal app folder only during Push", async () => {
  const f = driveFixture(), p = new DriveProvider(sampleAuth); f.empty();
  try { await p.connect(); expect((await p.listRoots())[0].root).toBe("gd:app-root"); expect(await p.list("gd:app-root")).toEqual([]); expect(f.writes()).toBe(0);
    const result = await p.push([{ id: "add", op: "add", ref: "gd:app-root", parent: "gd:app-root", name: "new.txt", bytesKey: "b" }], { readBytes: async () => new Blob(["x"]) });
    expect(result.completed).toEqual(["add"]); expect(f.writes()).toBe(2);
  } finally { f.dispose(); }
});
