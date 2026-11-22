import { githubProvider } from "../providers/github/adapter";
import { isConnectedAs } from "../providers/github/client";
import type { StorageProvider } from "../providers/types";
import { isLibraryItem, object, uniqueItems, labelColors, type Label, type LabelColor, type LibraryItem, type Organizer } from "./organizer";
import type { TransferEndpoint } from "./transferTypes";
import { localTransferSource, requestTransfer } from "./transferRequests";

export function requestCollectionsExport(value: Organizer) {
  const file = new File([portableOrganizer(value)], "collections.json", { type: "application/json" });
  requestTransfer({ move: false, collectionsExport: true, items: [localTransferSource(file, ".shelf/collections.json")] });
}

export async function readPortableOrganizer(
  target: TransferEndpoint,
  account: string,
  cloudProvider?: StorageProvider,
) {
  const provider =
    target.provider === "github" && isConnectedAs(account)
      ? githubProvider(async () => {
          throw Error("organizerInvalid");
        })
      : cloudProvider;
  if (!provider) throw Error("organizerInvalid");
  const shelf = (await provider.list(target.ref)).find(
    (entry) => entry.name === ".shelf" && entry.kind === "dir",
  );
  const file =
    shelf &&
    (await provider.list(shelf.ref)).find(
      (entry) => entry.name === "collections.json" && entry.kind === "file",
    );
  if (file?.size == null || file.size > 2_000_000)
    throw Error("organizerInvalid");
  const blob = await provider.read(file.ref);
  if (blob.size > 2_000_000) throw Error("organizerInvalid");
  return parseOrganizer(await blob.text());
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
