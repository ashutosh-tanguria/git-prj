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

function object(value: unknown): value is Record<string, unknown> {
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
export function portableOrganizer(value: Organizer) {
  return JSON.stringify(
    { version: 1, collections: value.collections, tags: value.tags },
    null,
    2,
  );
}
export function parseOrganizer(
  text: string,
): Pick<Organizer, "collections" | "tags"> {
  if (text.length > 2_000_000) throw Error("organizerInvalid");
  const value: unknown = JSON.parse(text);
  if (!object(value) || value.version !== 1) throw Error("organizerInvalid");
  const labels = (input: unknown): Label[] => {
    if (!Array.isArray(input) || input.length > 500)
      throw Error("organizerInvalid");
    const ids = new Set<string>();
    return input.map((label: unknown) => {
      if (
        !object(label) ||
        typeof label.id !== "string" ||
        !/^[a-f\d-]{36}$/i.test(label.id) ||
        ids.has(label.id) ||
        typeof label.name !== "string" ||
        !label.name.trim() ||
        label.name.length > 80 ||
        !labelColors.some((color) => color === label.color) ||
        !Array.isArray(label.items) ||
        !label.items.every(isLibraryItem)
      )
        throw Error("organizerInvalid");
      ids.add(label.id);
      return {
        id: label.id,
        name: label.name,
        color: label.color as LabelColor,
        items: uniqueItems(
          label.items.map(({ endpoint, entry }: LibraryItem) => ({
            endpoint: {
              provider: endpoint.provider,
              locationId: endpoint.locationId,
              ref: endpoint.ref,
            },
            entry: {
              ref: entry.ref,
              name: entry.name,
              kind: entry.kind,
              size: entry.size,
              modified: entry.modified,
              hash: entry.hash,
              version: entry.version,
            },
          })),
        ),
      };
    });
  };
  return { collections: labels(value.collections), tags: labels(value.tags) };
}
export function mergeLabels(local: Label[], incoming: Label[]) {
  const labels = new Map(local.map((label) => [label.id, label]));
  for (const label of incoming) {
    const existing = labels.get(label.id);
    labels.set(
      label.id,
      existing
        ? {
            ...existing,
            items: uniqueItems([...existing.items, ...label.items]),
          }
        : label,
    );
  }
  return [...labels.values()];
}
