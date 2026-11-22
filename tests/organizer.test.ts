import { expect, it } from "vitest";
import {
  emptyOrganizer,
  itemKey,
  labelColors,
  mergeLabels,
  parseOrganizer,
  portableOrganizer,
  refersToAccount,
  toggleFavorites,
  type LibraryItem,
} from "../src/services/organizer";

const git: LibraryItem = {
  endpoint: {
    provider: "github",
    locationId: "ada:ada/notes",
    ref: "gh:ada/notes@main/shared.txt",
  },
  entry: {
    ref: "gh:ada/notes@main/shared.txt",
    kind: "file",
    name: "shared.txt",
    size: 12,
    modified: null,
    hash: null,
    version: "a",
  },
};
const drive: LibraryItem = {
  endpoint: {
    provider: "gdrive",
    locationId: "drive-account",
    ref: "drive-file",
  },
  entry: { ...git.entry, ref: "drive-file" },
};
const collection = {
  id: "aaaaaaaa-0000-0000-0000-000000000000",
  name: "Work",
  color: labelColors[6],
  items: [git, drive],
};

it("keeps same-name items distinct and scopes references by account", () => {
  expect(itemKey(git)).not.toBe(itemKey(drive));
  expect(refersToAccount(git, "Ada", [])).toBe(true);
  expect(refersToAccount(git, "grace", [])).toBe(false);
  expect(refersToAccount(drive, "", ["drive-account"])).toBe(true);
  const favorites = toggleFavorites(emptyOrganizer, [git, drive]);
  expect(toggleFavorites(favorites, [git]).favorites).toEqual([drive]);
});

it("exports portable references and merges them without duplicate entries", () => {
  const json = portableOrganizer({
    ...emptyOrganizer,
    recent: [git],
    favorites: [drive],
    collections: [collection],
    tags: [collection],
  });
  expect(JSON.parse(json)).toMatchObject({ version: 1 });
  expect(JSON.parse(json)).not.toHaveProperty("recent");
  expect(JSON.parse(json)).not.toHaveProperty("favorites");
  const imported = parseOrganizer(json);
  expect(imported.collections).toEqual([collection]);
  expect(mergeLabels([collection], imported.collections)).toEqual([collection]);
  expect(imported.tags).toEqual([collection]);
});

it("rejects a forged GitHub location and strips undeclared import fields", () => {
  const exportWith = (item: unknown) =>
    JSON.stringify({
      version: 1,
      tags: [],
      collections: [{ ...collection, items: [item] }],
    });
  expect(() =>
    parseOrganizer(
      exportWith({
        ...git,
        endpoint: { ...git.endpoint, locationId: "ada:not/the-repo" },
      }),
    ),
  ).toThrow("organizerInvalid");
  expect(
    parseOrganizer(
      exportWith({ ...git, entry: { ...git.entry, extra: "unknown field" } }),
    ).collections[0].items[0],
  ).toEqual(git);
});
