import { useMemo } from "react";
import { FileTable } from "./FileTable";
import { itemKey, type LibraryItem } from "../services/organizer";
import type { Entry } from "../services/library";
import { renderItemTags, type OrganizerControls } from "./Organizer";

export function MixedExplorer({
  id,
  items,
  organizer,
  onOpen,
  onSelect,
}: {
  id: string;
  items: LibraryItem[];
  organizer: OrganizerControls;
  onOpen(item: LibraryItem): void;
  onSelect(items: LibraryItem[]): void;
}) {
  const refs = useMemo(
    () => new Map(items.map((item) => [itemKey(item), item])),
    [items],
  );
  const entries = useMemo<Entry[]>(
    () =>
      [...refs].map(([ref, { entry }]) => ({
        ...entry,
        ref,
        path: entry.name,
        size: entry.size ?? 0,
        sha: entry.version ?? "",
      })),
    [refs],
  );
  const get = (entry: Entry) => refs.get(entry.ref);
  const open = (entry: Entry) => {
    const item = get(entry);
    if (item) onOpen(item);
  };
  return (
    <FileTable
      mixed
      recent={id === "recent"}
      locationKey={id}
      entries={entries}
      reference={get}
      tags={(item) => renderItemTags([item], organizer)}
      onOpen={open}
      onPreview={open}
      onSelectionChange={(rows) =>
        onSelect(rows.flatMap((row) => get(row) ?? []))
      }
    />
  );
}
