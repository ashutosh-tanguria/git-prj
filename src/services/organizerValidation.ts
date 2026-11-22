import { parseRef } from "../lib/refs";
import type { LibraryItem } from "./organizer";

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
export function cleanLibraryItem({
  endpoint,
  entry,
}: LibraryItem): LibraryItem {
  return {
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
  };
}
export function parseDraggedReferences(text: string) {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || !value.every(isLibraryItem))
    throw Error("organizerInvalid");
  return value.map(cleanLibraryItem);
}
