import { expect, it } from "vitest";
import {
  createCloudStaging,
  type CloudChange,
} from "../src/services/cloudStaging";
import { DriveProvider } from "../src/providers/gdrive/client";
import { driveFixture, sampleAuth } from "./cloud-fixture";

function storage() {
  let persisted: CloudChange[] = [];
  const blobs = new Map<string, Blob>();
  return {
    load: async () => structuredClone(persisted),
    save: async (rows: CloudChange[]) => {
      persisted = structuredClone(rows);
    },
    put: async (key: string, blob: Blob) => {
      blobs.set(key, blob);
    },
    get: async (key: string) => blobs.get(key)!,
  };
}
const lock = async <T>(action: () => Promise<T>) => action();

for (const status of [401, 503]) {
  it("keeps unconfirmed bytes and progress on write " + status, async () => {
    const fixture = driveFixture();
    const provider = new DriveProvider(sampleAuth);
    const stored = storage();
    try {
      await provider.connect();
      const [root] = await provider.listRoots();
      const staging = createCloudStaging(stored, lock);
      await staging.stage(
        root,
        ["first", "second", "third"].map((id) => ({
          change: {
            id,
            ref: root.root,
            parent: root.root,
            name: id + ".txt",
            label: id,
            op: "add",
            locationId: root.id,
          },
          bytes: new Blob([id]),
        })),
      );
      fixture.failWrite(2, status);
      const result = await staging.push(provider, root, {});
      expect(result.completed).toEqual(["first"]);
      expect(result.failed?.error.code).toBe(
        status === 401 ? "AUTH_EXPIRED" : "PROVIDER_DOWN",
      );
      const reopened = createCloudStaging(stored, lock);
      const remaining = await reopened.load();
      expect(remaining.map((row) => row.id)).toEqual(["second", "third"]);
      expect(await (await stored.get(remaining[0].bytesKey!)).text()).toBe(
        "second",
      );
      expect(fixture.writes()).toBe(2);
      if (status === 401) {
        expect(provider.isConnected()).toBe(false);
        await provider.connect();
        expect((await reopened.push(provider, root, {})).completed).toEqual([
          "second",
          "third",
        ]);
        expect(await reopened.load()).toEqual([]);
      } else {
        expect(
          (await reopened.push(provider, root, {})).failed?.error.details
            .uncertain,
        ).toBe(true);
        expect(fixture.writes()).toBe(2);
      }
    } finally {
      fixture.dispose();
    }
  });
}
