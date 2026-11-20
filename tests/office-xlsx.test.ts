import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { utils, write, CFB } from "xlsx";

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
  const encrypted = CFB.utils.cfb_new();
  CFB.utils.cfb_add(encrypted, "EncryptionInfo", new Uint8Array([4, 0, 4, 0]));
  CFB.utils.cfb_add(encrypted, "EncryptedPackage", new Uint8Array(32));
  worker.onmessage({
    data: new Uint8Array(CFB.write(encrypted, { type: "buffer" })).buffer,
  });
  expect(postMessage.mock.lastCall?.[0]).toEqual({ error: "password" });
  const workbook = utils.book_new();
  utils.book_append_sheet(
    workbook,
    utils.aoa_to_sheet(Array.from({ length: 5001 }, (_, index) => [index])),
    "Long",
  );
  worker.onmessage({
    data: write(workbook, { type: "array", bookType: "xlsx" }),
  });
  const long = postMessage.mock.lastCall?.[0].sheets[0];
  expect(long.rows).toHaveLength(5000);
  expect(long.rows.at(-1)).toEqual(["4999"]);
  expect(long.truncated).toBe(true);
  worker.onmessage({ data: new TextEncoder().encode("not an archive").buffer });
  expect(postMessage.mock.lastCall?.[0]).toEqual({ error: "corrupt" });
});
