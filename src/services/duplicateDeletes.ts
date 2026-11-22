import type { Location } from "../providers/types";
import { parseRef } from "../lib/refs";
import { itemKey, type LibraryItem } from "./organizer";
import type { DuplicateGroup } from "./duplicates";
import type { ResolveProvider } from "./transferTypes";
import { cloudStaging } from "./cloudStaging";
import { selectionJob } from "./selectionJob";

export function duplicateDeleteBatches(
  groups: DuplicateGroup[],
  keys: Set<string>,
) {
  const batches = new Map<string, LibraryItem[]>();
  for (const { items } of groups) {
    if (items.every((item) => keys.has(itemKey(item))))
      throw Error("duplicateKeepOne");
    for (const item of items) {
      if (!keys.has(itemKey(item))) continue;
      if (!item.entry.version) throw Error("cloudSelectVersioned");
      const { endpoint } = item;
      const branch =
        endpoint.provider === "github" ? parseRef(endpoint.ref).branch : "";
      const key = JSON.stringify([
        endpoint.provider,
        endpoint.locationId,
        branch,
      ]);
      const batch = batches.get(key);
      if (batch) batch.push(item);
      else batches.set(key, [item]);
    }
  }
  return [...batches.values()];
}
export async function checkDuplicateVersions(
  groups: DuplicateGroup[],
  selected: Set<string>,
  resolve: ResolveProvider,
) {
  for (const group of groups) {
    const remove = group.items.filter((item) => selected.has(itemKey(item)));
    if (!remove.length) continue;
    const keep = group.items.find(
      (item) => !selected.has(itemKey(item)) && item.entry.version,
    );
    if (!keep) throw Error("duplicateKeepOne");
    for (const item of [keep, ...remove]) {
      const provider = await resolve(item.endpoint);
      if (
        (await provider.stat(item.endpoint.ref)).version !== item.entry.version
      )
        throw Error("transferSourceChanged");
    }
  }
}
export function gitDuplicateJob(items: LibraryItem[]) {
  return selectionJob(
    "delete",
    parseRef(items[0].endpoint.ref),
    items.map(({ entry }) => ({
      ...entry,
      path: parseRef(entry.ref).path,
      size: entry.size ?? 0,
      sha: entry.version ?? "",
    })),
    "",
  );
}
export async function stageCloudDuplicates(
  items: LibraryItem[],
  roots: Location[],
) {
  const target = items[0].endpoint;
  const root = roots.find(
    (root) =>
      root.id === target.locationId && root.provider === target.provider,
  );
  if (!root) throw Error("transferAccountChanged");
  await cloudStaging.stage(
    root,
    items.map(({ entry }) => ({
      change: {
        id: crypto.randomUUID(),
        locationId: root.id,
        op: "delete",
        ref: entry.ref,
        baseVersion: entry.version ?? undefined,
        label: entry.name,
      },
    })),
  );
  window.dispatchEvent(new Event("shelf-pending-changed"));
}
