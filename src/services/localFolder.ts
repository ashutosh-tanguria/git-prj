import { downloadZip } from "client-zip";
import type { Entry, StorageProvider } from "../providers/types";
import { FOLDER_UPLOAD_CAP } from "./folderUpload";
import { copyName } from "./folderOperations";
import { folderPath } from "./destinations";
import type { ResolveProvider, TransferSource } from "./transferTypes";

export interface LocalFile {
  file: File;
  path: string;
}
type Directory = FileSystemDirectoryHandle & {
  values(): AsyncIterable<FileSystemHandle>;
};
type DirectoryPicker = (options: {
  mode: "read" | "readwrite";
}) => Promise<Directory>;

export function directoryPicker(): DirectoryPicker | undefined {
  const picker = (window as Window & { showDirectoryPicker?: DirectoryPicker })
    .showDirectoryPicker;
  return picker?.bind(window);
}
function validImport(items: LocalFile[]) {
  if (!items.length) throw Error("localImportEmpty");
  if (items.length > FOLDER_UPLOAD_CAP) throw Error("transferFolderLimit");
  const paths = new Set<string>();
  for (const { path } of items) {
    folderPath(path);
    if (!path.includes("/") || paths.has(path))
      throw Error("localImportInvalid");
    paths.add(path);
  }
  return items;
}
export function filesFromDirectoryInput(files: FileList) {
  return validImport(
    Array.from(files, (file) => ({ path: file.webkitRelativePath, file })),
  );
}
export async function readLocalDirectory(directory: Directory) {
  const files: LocalFile[] = [];
  async function walk(handle: Directory, path: string) {
    for await (const child of handle.values()) {
      const next = path + "/" + child.name;
      if (child.kind === "directory") await walk(child as Directory, next);
      else {
        if (files.length === FOLDER_UPLOAD_CAP)
          throw Error("transferFolderLimit");
        files.push({
          path: next,
          file: await (child as FileSystemFileHandle).getFile(),
        });
      }
    }
  }
  await walk(directory, directory.name);
  return validImport(files);
}

type RemoteSource = Extract<TransferSource, { endpoint: object }>;
export function exportSources(items: TransferSource[]): RemoteSource[] {
  const files = items.filter(
    (item): item is RemoteSource =>
      "endpoint" in item && item.entry.kind === "file" && !!item.entry.version,
  );
  if (!files.length || files.length !== items.length)
    throw Error("localExportSelect");
  return files;
}
function filename(entry: Entry) {
  if (
    !entry.name ||
    /[\/\\\x00-\x1f]/.test(entry.name) ||
    [".", ".."].includes(entry.name)
  )
    throw Error("pushPath");
  return entry.name;
}
async function pipeRemote(
  provider: StorageProvider,
  entry: Entry,
  destination: WritableStream<Uint8Array>,
) {
  const check = async () => {
    if ((await provider.stat(entry.ref)).version !== entry.version)
      throw Error("transferSourceChanged");
  };
  await check();
  await provider.read(entry.ref, {
    blobSha:
      provider.id === "github" ? (entry.version ?? undefined) : undefined,
    consume: async (response) => {
      if (!response.body) throw Error("transferReadFailed");
      await response.body.pipeTo(destination, { preventClose: true });
      return new Blob();
    },
  });
  await check();
  await destination.close();
}
async function freeName(
  directory: FileSystemDirectoryHandle,
  original: string,
) {
  let name = original;
  for (let index = 1; ; index++) {
    try {
      await directory.getFileHandle(name);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      if (error.name === "NotFoundError") return name;
      if (error.name !== "TypeMismatchError") throw error;
    }
    name = copyName(original, index, false);
  }
}
export async function exportLocalDirectory(
  directory: FileSystemDirectoryHandle,
  files: RemoteSource[],
  resolve: ResolveProvider,
) {
  for (const { endpoint, entry } of files) {
    const provider = await resolve(endpoint);
    const name = await freeName(directory, filename(entry));
    const handle = await directory.getFileHandle(name, { create: true });
    try {
      const writable = await handle.createWritable();
      try {
        await pipeRemote(provider, entry, writable);
      } catch (error) {
        await writable.abort().catch(() => undefined);
        throw error;
      }
    } catch (error) {
      await directory.removeEntry(name).catch(() => undefined);
      throw error;
    }
  }
}
export async function exportLocalZip(
  files: RemoteSource[],
  resolve: ResolveProvider,
) {
  const used = new Set<string>();
  async function* entries() {
    for (const { endpoint, entry } of files) {
      const original = filename(entry);
      let name = original;
      for (let index = 1; used.has(name.toLowerCase()); index++)
        name = copyName(original, index, false);
      used.add(name.toLowerCase());
      const provider = await resolve(endpoint);
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      void pipeRemote(provider, entry, stream.writable).catch(
        (error: unknown) => stream.writable.abort(error).catch(() => undefined),
      );
      yield { name, input: stream.readable };
    }
  }
  return downloadZip(entries()).blob();
}
