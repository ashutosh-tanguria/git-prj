import { cacheData } from "./cacheData";
import { parseRef } from "../lib/refs";
import type { TransferEndpoint } from "./transferTypes";
import type { Entry } from "../providers/types";

export type LibraryItem = { endpoint: TransferEndpoint; entry: Entry };
export const labelColors = [
  "blue",
  "green",
  "red",
  "amber",
  "violet",
  "orange",
  "teal",
  "pink",
] as const;
export type LabelColor = (typeof labelColors)[number];
export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  items: LibraryItem[];
}
export interface Organizer {
  recent: LibraryItem[];
  favorites: LibraryItem[];
  collections: Label[];
  tags: Label[];
}
export const emptyOrganizer: Organizer = {
  recent: [],
  favorites: [],
  collections: [],
  tags: [],
};
export const organizerChange = "shelf-organizer-changed";
export const dragReference = "application/x-shelf-reference";
export const itemKey = ({ endpoint }: LibraryItem) =>
  JSON.stringify([endpoint.provider, endpoint.locationId, endpoint.ref]);
export const uniqueItems = (items: LibraryItem[]) => [
  ...new Map(items.map((item) => [itemKey(item), item])).values(),
];
export const readOrganizer = async () =>
  (await cacheData.get<Organizer>("settings", "organizer")) ?? emptyOrganizer;
export async function updateOrganizer(change: (value: Organizer) => Organizer) {
  await cacheData.update("settings", "organizer", emptyOrganizer, change);
  window.dispatchEvent(new Event(organizerChange));
}
export function recordOpen(item: LibraryItem) {
  if (item.entry.kind === "file")
    void updateOrganizer((value) => ({
      ...value,
      recent: uniqueItems([
        item,
        ...value.recent.filter((old) => itemKey(old) !== itemKey(item)),
      ]).slice(0, 100),
    })).catch(() => {});
}
export function toggleFavorites(value: Organizer, items: LibraryItem[]) {
  const ids = new Set(items.map(itemKey));
  const existing = new Set(value.favorites.map(itemKey));
  return {
    ...value,
    favorites: items.every((item) => existing.has(itemKey(item)))
      ? value.favorites.filter((item) => !ids.has(itemKey(item)))
      : uniqueItems([...value.favorites, ...items]),
  };
}
export const refersToAccount = (
  item: LibraryItem,
  account: string,
  roots: string[],
) =>
  item.endpoint.provider === "github"
    ? !!account &&
      item.endpoint.locationId
        .toLowerCase()
        .startsWith(account.toLowerCase() + ":")
    : roots.includes(item.endpoint.locationId);

export function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
export function isLibraryItem(value: unknown): value is LibraryItem {
  if (!object(value) || !object(value.endpoint) || !object(value.entry))
    return false;
  const { endpoint, entry } = value;
  if (
    typeof endpoint.ref !== "string" ||
    endpoint.ref.length > 4096 ||
    typeof endpoint.locationId !== "string" ||
    endpoint.locationId.length > 1024 ||
    !["github", "gdrive", "dropbox", "onedrive"].some(
      (id) => id === endpoint.provider,
    ) ||
    endpoint.ref !== entry.ref ||
    typeof entry.name !== "string" ||
    !["file", "dir"].some((kind) => kind === entry.kind) ||
    !(
      entry.size === null ||
      (typeof entry.size === "number" &&
        Number.isSafeInteger(entry.size) &&
        entry.size >= 0)
    ) ||
    ![entry.modified, entry.hash, entry.version].every(
      (field) => field === null || typeof field === "string",
    )
  )
    return false;
  if (endpoint.provider === "github") {
    try {
      const { owner, repo } = parseRef(endpoint.ref);
      if (!endpoint.locationId.endsWith(":" + owner + "/" + repo)) return false;
    } catch {
      return false;
    }
  }
  return true;
}
