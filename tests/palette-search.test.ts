import { expect, it } from "vitest";
import {
  buildNames,
  findNames,
  type NamedEntry,
} from "../src/services/filenameSearch";
import { nameMatches, paletteQuery } from "../src/services/paletteQuery";
import {
  commandBinding,
  defaultShortcuts,
  validShortcuts,
} from "../src/services/shortcuts";

it("interprets every palette prefix and blends unprefixed input", () => {
  expect(
    ["> cmd", "/ fn", "? text", "@ root", "# tag", " recent"].map(paletteQuery),
  ).toEqual([
    { mode: "commands", query: "cmd" },
    { mode: "names", query: "fn" },
    { mode: "text", query: "text" },
    { mode: "locations", query: "root" },
    { mode: "tags", query: "tag" },
    { mode: "mixed", query: "recent" },
  ]);
});

it("filters case and Unicode-normalized names within signed-in listing scopes", () => {
  const scope = "github:ada";
  const path = "folder/Café.pdf";
  const recent: NamedEntry = {
    name: "Café.pdf",
    path,
    scope,
    ref: "visible",
    lastUsed: 10,
    kind: "file",
  };
  const results = buildNames(
    [
      {
        scope,
        ref: "folder",
        fetchedAt: 0,
        entries: [recent, { ref: "dir", name: "Café", kind: "dir" }],
      },
      {
        scope: "github:other",
        ref: "folder",
        fetchedAt: 0,
        entries: [{ ...recent, ref: "private" }],
      },
    ],
    [recent],
    [scope],
  );
  expect(findNames(results, "CAFE\u0301", "file")).toEqual([recent]);
  expect(findNames(results, "", "dir").map((item) => item.ref)).toEqual([
    "dir",
  ]);
  expect(nameMatches("Archive.txt", "  CHIVE  ")).toBe(true);
});

it("uses the customized Push binding and reserves Ctrl+K for the palette", () => {
  expect(commandBinding("push", { ...defaultShortcuts, push: "Alt+q" })).toBe(
    "Alt+q",
  );
  expect(validShortcuts({ ...defaultShortcuts, push: "Control+k" })).toBe(
    false,
  );
});
