import type { Entry } from "./library";
import type { GitRef } from "../lib/refs";
import { parseRef } from "../lib/refs";
import { read } from "../providers/github/client";
import { evaluateFile } from "./guards";
import { folderPath } from "./destinations";
import type { Change } from "./staging";
import { planEntries } from "./folderOperations";
import type { CollisionChoice } from "./folderTypes";
export function clipboardJob(destination: GitRef) {
  const selection = clipboard;
  return (choice?: CollisionChoice) => {
    if (!selection?.entries.length) throw Error("clipboardEmpty");
    return planEntries(selection.entries, destination, selection.cut, choice);
  };
}
let clipboard: { entries: Entry[]; cut: boolean } | undefined;
export function setFileClipboard(entries: Entry[], cut: boolean) {
  clipboard = { entries: [...entries], cut };
}
export async function planPaste(
  destination: GitRef,
): Promise<(Change & { blob?: Blob })[]> {
  if (!clipboard?.entries.length) throw Error("clipboardEmpty");
  folderPath(destination.path);
  const result: (Change & { blob?: Blob })[] = [];
  for (const entry of clipboard.entries) {
    if (entry.kind !== "file") throw Error("clipboardFilesOnly");
    const source = parseRef(entry.ref),
      same =
        source.owner === destination.owner &&
        source.repo === destination.repo &&
        source.branch === destination.branch,
      path = [destination.path, entry.name].filter(Boolean).join("/");
    if (same && path === source.path) throw Error("clipboardSamePath");
    if (clipboard.cut && !same) throw Error("clipboardCrossRepository");
    const blob = clipboard.cut ? undefined : await read(source);
    result.push({
      id: crypto.randomUUID(),
      target: { ...destination, path },
      kind: clipboard.cut ? "rename" : "add",
      oldPath: clipboard.cut ? source.path : undefined,
      baseVersion: clipboard.cut ? entry.sha : undefined,
      blob,
      createdAt: Date.now(),
      size: blob?.size || 0,
      verdict: evaluateFile(blob?.size || 0),
    });
  }
  return result;
}
