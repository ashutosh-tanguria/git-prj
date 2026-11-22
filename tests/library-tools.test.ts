import { expect, it, vi } from "vitest";
import {
  duplicateDeleteSelection,
  scanDuplicates,
} from "../src/services/duplicates";
import { duplicateDeleteBatches } from "../src/services/duplicateDeletes";
import { planSelectionZip } from "../src/services/selectionZip";
import { hashSha256Stream } from "../src/services/transferHash";
import { itemKey, type LibraryItem } from "../src/services/organizer";

function file(
  name: string,
  size: number,
  provider: "github" | "gdrive" = "github",
): LibraryItem {
  const ref =
    provider === "github" ? "gh:ada/notes@main/" + name : "gd:" + name;
  return {
    endpoint: {
      provider,
      locationId: provider === "github" ? "ada:ada/notes" : "drive-ada",
      ref,
    },
    entry: {
      ref,
      name,
      kind: "file",
      size,
      modified: null,
      version: "1",
      hash: null,
    },
  };
}

it("hashes streams incrementally with the same SHA-256 digest across chunks", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("he"));
      controller.enqueue(encoder.encode("llo"));
      controller.close();
    },
  });
  await expect(hashSha256Stream(stream)).resolves.toBe(
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

it("groups equal bytes among matching sizes and protects the last copy", async () => {
  const files = [
    file("a", 7),
    file("b", 7, "gdrive"),
    file("c", 7),
    file("different", 9),
  ];
  const hash = vi.fn(async ({ entry }: LibraryItem) =>
    entry.name === "c" ? "other" : "same",
  );
  const result = await scanDuplicates(
    files,
    hash,
    new AbortController().signal,
    () => {},
  );
  expect(hash).toHaveBeenCalledTimes(3);
  expect(result.groups).toEqual([{ digest: "same", items: files.slice(0, 2) }]);
  const selection = duplicateDeleteSelection(result.groups);
  expect(duplicateDeleteBatches(result.groups, selection)).toEqual([
    [files[1]],
  ]);
  expect(() =>
    duplicateDeleteBatches(result.groups, new Set(files.map(itemKey))),
  ).toThrow("duplicateKeepOne");
});

it("plans safe ZIP paths, disambiguates case collisions and checks metadata overhead", async () => {
  const resolve = vi.fn();
  const signal = new AbortController().signal;
  const files = [
    file("Note.txt", 4),
    file("note.txt", 5, "gdrive"),
    file("bad/unsafe.txt", 0),
  ];
  const plan = await planSelectionZip(files, resolve, signal);
  expect(plan.files.map((row) => row.name)).toEqual([
    "Note.txt",
    "note (shelf copy).txt",
    "bad_unsafe.txt",
  ]);
  await expect(
    planSelectionZip(files, resolve, signal, plan.length - 1),
  ).rejects.toThrow("zipTooLarge");
  expect(resolve).not.toHaveBeenCalled();
});

it("stops a duplicate scan instead of returning partial results after cancellation", async () => {
  const controller = new AbortController();
  await expect(
    scanDuplicates(
      [file("a", 10), file("b", 10)],
      async () => {
        controller.abort();
        return "aborted";
      },
      controller.signal,
      () => {},
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
});
