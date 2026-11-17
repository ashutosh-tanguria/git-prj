import { ProviderError } from "../providers/github/client";
import { folderPath } from "./destinations";
import type { UploadItem } from "./folderOperations";
export const FOLDER_UPLOAD_CAP = 2000;
interface DirectoryEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  file?: (
    ok: (file: File) => void,
    fail: (error: DOMException) => void,
  ) => void;
  createReader?: () => {
    readEntries: (
      ok: (entries: DirectoryEntry[]) => void,
      fail: (error: DOMException) => void,
    ) => void;
  };
}
export function directoryFiles(files: File[]): UploadItem[] {
  if (!files.length) throw new ProviderError("folderEmptyPicker");
  if (files.length > FOLDER_UPLOAD_CAP)
    throw new ProviderError("folderUploadCap");
  return files.map((blob) => {
    const path = blob.webkitRelativePath || blob.name;
    folderPath(path);
    return { path, blob };
  });
}
export async function droppedFiles(
  data: Pick<DataTransfer, "items" | "files">,
): Promise<{ folders: boolean; items: UploadItem[] }> {
  // Entry handles must be captured synchronously while the drop event is active.
  const entries = Array.from(data.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.() as DirectoryEntry | null);
  const plain = Array.from(data.files);
  if (
    (!plain.length && entries.every((e) => !e)) ||
    (entries.some((e) => e?.isDirectory) && entries.some((e) => !e))
  )
    throw new ProviderError("folderEntryUnavailable");
  if (!entries.length || entries.some((e) => !e))
    return {
      folders: plain.some((f) => !!f.webkitRelativePath),
      items: directoryFiles(plain),
    };
  const output: UploadItem[] = [];
  const add = (item: UploadItem) => {
    if (output.length >= FOLDER_UPLOAD_CAP)
      throw new ProviderError("folderUploadCap");
    folderPath(item.path);
    output.push(item);
  };
  const walk = async (entry: DirectoryEntry, prefix: string) => {
    const path = prefix + entry.name;
    if (entry.isFile && entry.file) {
      const blob = await new Promise<File>((ok, fail) => entry.file!(ok, fail));
      add({ path, blob });
    } else if (entry.isDirectory && entry.createReader) {
      const reader = entry.createReader();
      let found = false;
      for (;;) {
        const batch = await new Promise<DirectoryEntry[]>((ok, fail) =>
          reader.readEntries(ok, fail),
        );
        if (!batch.length) break;
        found = true;
        for (const child of batch) await walk(child, path + "/");
      }
      if (!found) add({ path: path + "/.gitkeep", blob: new Blob([]) });
    } else throw new ProviderError("folderEntryUnavailable");
  };
  for (const entry of entries) await walk(entry!, "");
  return { folders: entries.some((e) => e?.isDirectory), items: output };
}
