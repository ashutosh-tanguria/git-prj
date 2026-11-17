import { expect, it } from "vitest";
import { createStaging, type Change } from "../src/services/staging";
import { evaluateFile } from "../src/services/guards";
import { exportWorking, parseWorking } from "../src/services/workingBackup";
it("durably stages, reloads, undoes, redoes, discards and backs up bytes", async () => {
  let rows: Change[] = [];
  const bytes = new Map<string, Blob>();
  const storage = {
    load: async () => rows,
    save: async (value: Change[]) => {
      rows = value;
    },
    put: async (key: string, b: Blob) => {
      bytes.set(key, b);
    },
    get: async (key: string) => bytes.get(key)!,
  };
  const store = createStaging(storage);
  const change = {
    id: "sample",
    target: { owner: "ada", repo: "notes", branch: "main", path: "week/a.txt" },
    kind: "add" as const,
    size: 3,
    createdAt: 0,
    verdict: evaluateFile(3),
    blob: new Blob(["abc"]),
  };
  await store.stage([change]);
  expect(rows).toHaveLength(1);
  const second = createStaging(storage);
  await second.load();
  expect(second.snapshot()).toHaveLength(1);
  await store.undo();
  expect(rows).toHaveLength(0);
  await store.redo();
  const backup = await exportWorking(rows, store.read),
    parsed = await parseWorking(backup);
  expect(parsed.rows).toHaveLength(1);
  expect(new TextDecoder().decode(parsed.files.get("sample"))).toBe("abc");
  await store.discard(["sample"]);
  expect(rows).toHaveLength(0);
});
