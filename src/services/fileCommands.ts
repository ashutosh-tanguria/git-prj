import type { GitRef } from "../lib/refs";
import type { Entry } from "./library";
import type { Change } from "./staging";
import { ProviderError } from "../providers/github/client";
import { folderPath } from "./destinations";
import { evaluateFile } from "./guards";
export function prepareFileCommand(
  action: string,
  current: GitRef,
  selection: Entry[],
  name: string,
): (Change & { blob?: Blob })[] {
  const make = (entry: Entry, kind: Change["kind"], path: string): Change => ({
    id: crypto.randomUUID(),
    target: { ...current, path },
    kind,
    oldPath: kind === "rename" ? entry.path : undefined,
    baseVersion: entry.sha,
    size: kind === "delete" ? entry.size : 0,
    createdAt: Date.now(),
    verdict: evaluateFile(0),
  });
  if (action === "delete") {
    if (!selection.length || selection.some((e) => e.kind !== "file"))
      throw new ProviderError("clipboardFilesOnly");
    return selection.map((entry) => make(entry, "delete", entry.path));
  }
  folderPath(name);
  if (!name) throw new ProviderError("destinationInvalid");
  if (action === "rename") {
    if (
      selection.length !== 1 ||
      selection[0].kind !== "file" ||
      name.includes("/")
    )
      throw new ProviderError("clipboardFilesOnly");
    return [
      make(
        selection[0],
        "rename",
        [current.path, name].filter(Boolean).join("/"),
      ),
    ];
  }
  return [
    {
      id: crypto.randomUUID(),
      target: {
        ...current,
        path: [current.path, name, ".gitkeep"].filter(Boolean).join("/"),
      },
      kind: "add",
      size: 0,
      createdAt: Date.now(),
      verdict: evaluateFile(0),
      blob: new Blob([]),
    },
  ];
}
