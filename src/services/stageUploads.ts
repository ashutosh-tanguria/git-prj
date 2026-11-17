import { parseWorking } from "./workingBackup";
import { staging } from "./workingStorage";
import type { Entry } from "./library";
import type { GitRef } from "../lib/refs";
import { evaluateFile } from "./guards";
export async function stageUploads(
  target: GitRef,
  files: File[],
  entries: Entry[],
) {
  await staging.stage(
    files.map((blob) => {
      const path = [target.path, blob.name].filter(Boolean).join("/"),
        existing = entries.find((entry) => entry.path === path);
      if (
        blob.name.includes("/") ||
        blob.name.includes("\\") ||
        existing?.kind === "special"
      )
        throw Error("pushPath");
      return {
        id: crypto.randomUUID(),
        target: { ...target, path },
        kind: existing ? ("modify" as const) : ("add" as const),
        baseVersion: existing?.sha,
        baseSize: existing?.size,
        size: blob.size,
        createdAt: Date.now(),
        verdict: evaluateFile(blob.size),
        blob,
      };
    }),
  );
}

export async function restoreWorkingFile(file: Blob) {
  const parsed = await parseWorking(file);
  await staging.stage(
    parsed.rows.map((row) => ({
      ...row,
      id: crypto.randomUUID(),
      blob: row.blobKey
        ? new Blob([new Uint8Array(parsed.files.get(row.blobKey)!).buffer])
        : undefined,
    })),
  );
}
