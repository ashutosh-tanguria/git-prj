import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllGlobals());
it("the actual spreadsheet worker reads two sheets and saved formula values", async () => {
  const postMessage = vi.fn();
  const worker = {
    postMessage,
    onmessage: undefined as unknown as (event: { data: ArrayBuffer }) => void,
  };
  vi.stubGlobal("self", worker);
  await import("../sandbox/spreadsheet.worker");
  const bytes = readFileSync("fixtures/office-reading.xlsx");
  worker.onmessage({
    data: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
  });
  const { sheets } = postMessage.mock.calls[0][0];
  expect(sheets.map((sheet: { name: string }) => sheet.name)).toEqual([
    "Summary",
    "Notes",
  ]);
  expect(sheets[0].rows[2]).toEqual(["Total", "6"]);
  expect(sheets[0].truncated).toBe(false);
  worker.onmessage({ data: new Uint8Array([80, 75, 3, 4, 0]).buffer });
  expect(postMessage.mock.lastCall?.[0]).toEqual({ error: "corrupt" });
});
