import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { StorageProvider } from "../src/providers/types";
export interface ContractFixture {
  provider: StorageProvider; root: string; file: string;
  reset(): void; error(status: number): void; pages(): void;
  writes(): number; dispose(): void;
}
// Each adapter supplies protocol fixtures, never an alternate mock implementation.
export function providerContract(name: string, create: () => ContractFixture) {
  describe(name + " shared provider contract", () => {
    let f: ContractFixture;
    beforeEach(async () => { f = create(); f.reset(); await f.provider.connect(); });
    afterEach(() => f.dispose());
    it("normalizes roots, list and stat", async () => {
      expect((await f.provider.listRoots())[0].provider).toBe(f.provider.id);
      const rows = await f.provider.list(f.root);
      expect(rows[0]).toMatchObject({ ref: f.file, name: "reading-notes.txt", kind: "file" });
      expect((await f.provider.stat(f.file)).version).toBeTruthy();
    });
    it("exhausts pagination without losing entries", async () => {
      f.pages(); const rows = await f.provider.list(f.root);
      expect(rows.length).toBeGreaterThan(1);
      expect(new Set(rows.map((e) => e.ref)).size).toBe(rows.length);
    });
    it("reads binary bytes and historical versions", async () => {
      expect(await (await f.provider.read(f.file)).text()).toBe("sample reading bytes");
      const versions = await f.provider.history(f.file);
      expect(versions[0].id).toBeTruthy();
      expect(await (await f.provider.read(f.file, { version: versions[0].id })).text()).toBe("sample reading bytes");
    });
    it("writes only on push and checkpoints completion", async () => {
      await f.provider.list(f.root); expect(f.writes()).toBe(0);
      const completed: string[] = [];
      const result = await f.provider.push([{ id: "add", op: "add", ref: f.root, parent: f.root, name: "new.txt", bytesKey: "bytes" }], {
        readBytes: async () => new Blob(["sample reading bytes"]),
        onComplete: async (id) => { completed.push(id); }, message: "Add new.txt",
      });
      expect(result.completed).toEqual(["add"]); expect(completed).toEqual(["add"]);
      expect(f.writes()).toBeGreaterThan(0);
    });
    for (const [status, code] of [[403, "PERMISSION"], [404, "NOT_FOUND"], [412, "CONFLICT"], [413, "TOO_LARGE"], [507, "QUOTA"], [503, "PROVIDER_DOWN"]] as const)
      it("maps " + status + " to " + code, async () => {
        f.error(status); await expect(f.provider.stat(f.file)).rejects.toMatchObject({ code });
      });
    it("exposes rate limit delay without a retry loop", async () => {
      f.error(429); await expect(f.provider.stat(f.file)).rejects.toMatchObject({ code: "RATE_LIMITED", details: { retryAfter: 30 } });
    });
    it("expires auth and disconnects without persisting credentials", async () => {
      f.error(401); await expect(f.provider.stat(f.file)).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
      expect(f.provider.isConnected()).toBe(false);
      await f.provider.disconnect(); expect(f.provider.isConnected()).toBe(false);
    });
  });
}
