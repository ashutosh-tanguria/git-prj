import type { GitRef } from "../lib/refs";
import type { Entry } from "./library";
import type { CollisionChoice } from "./folderTypes";
import { planEntries, planFolderUpload } from "./folderOperations";
import { folderPath } from "./destinations";
import { ProviderError } from "../providers/github/client";
export function selectionJob(
  action: string,
  current: GitRef,
  selection: Entry[],
  name: string,
) {
  if (action === "newFolder") {
    folderPath(name);
    if (!name) throw new ProviderError("destinationInvalid");
    return (choice?: CollisionChoice) =>
      planFolderUpload(
        current,
        [{ path: name + "/.gitkeep", blob: new Blob([]) }],
        choice,
      );
  }
  if (
    action === "rename" &&
    (selection.length !== 1 || !name || name.includes("/"))
  )
    throw new ProviderError("destinationInvalid");
  return (choice?: CollisionChoice) =>
    planEntries(
      selection,
      current,
      true,
      choice,
      action === "rename" ? name : undefined,
      action === "delete",
    );
}
