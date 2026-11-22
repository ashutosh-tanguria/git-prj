import { downloadZip, predictLength } from "client-zip";
import { cacheData } from "./cacheData";
import type { CachedListing } from "./listingCache";
import type { Entry } from "../providers/types";
import { copyName } from "./folderOperations";
import { itemKey, type LibraryItem } from "./organizer";
import {
  referenceCacheRecord,
  referenceIdentity,
  streamReference,
} from "./referenceRead";
import type { ResolveProvider } from "./transferTypes";

export const ZIP_MEMORY_LIMIT = 100 * 1024 * 1024;
const ZIP_ENTRY_LIMIT = 5000;
const validEntryName = (name: string) => {
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/, "");
  if (!sanitized || sanitized.length > 240) throw Error("zipInvalidPath");
  return /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(sanitized)
    ? "_" + sanitized
    : sanitized;
};
interface ZipFile {
  name: string;
  size: number;
  item?: LibraryItem;
}
export async function planSelectionZip(
  items: LibraryItem[],
  resolve: ResolveProvider,
  signal: AbortSignal,
  memoryLimit = ZIP_MEMORY_LIMIT,
) {
  const files: ZipFile[] = [];
  let bytes = 0;
  async function append(
    item: LibraryItem,
    parent: string,
    used: Set<string>,
    ancestors: string[],
  ) {
    signal.throwIfAborted();
    const key = itemKey(item);
    if (
      files.length >= ZIP_ENTRY_LIMIT ||
      ancestors.includes(key) ||
      ancestors.length > 32
    )
      throw Error("zipTooMany");
    const base = validEntryName(item.entry.name);
    let name = base;
    for (let index = 1; used.has(name.toLowerCase()); index++)
      name = copyName(base, index, item.entry.kind === "dir");
    used.add(name.toLowerCase());
    const path = parent + name;
    if (item.entry.kind === "dir") {
      const { scope, ref } = referenceIdentity(item);
      const children = navigator.onLine
        ? await (await resolve(item.endpoint)).list(ref, { signal })
        : (
            await cacheData.get<CachedListing<Entry>>(
              "listings",
              JSON.stringify([scope, ref]),
            )
          )?.entries;
      if (!children) throw Error("offlineMissing");
      files.push({ name: path + "/", size: 0 });
      const names = new Set<string>();
      for (const child of children)
        if (child.kind !== "special")
          await append(
            {
              entry:
                item.endpoint.provider === "github" &&
                "sha" in child &&
                typeof child.sha === "string"
                  ? { ...child, version: child.sha }
                  : child,
              endpoint: { ...item.endpoint, ref: child.ref },
            },
            path + "/",
            names,
            [...ancestors, key],
          );
      return;
    }
    if (item.entry.kind !== "file") return;
    let size = item.entry.size;
    if (size == null) {
      const cached = await referenceCacheRecord(item);
      size =
        cached && (!item.entry.version || cached.version === item.entry.version)
          ? cached.size
          : null;
    }
    if (size == null && navigator.onLine) {
      const entry = await (
        await resolve(item.endpoint)
      ).stat(item.endpoint.ref);
      item = { ...item, entry };
      size = entry.size;
    }
    if (size == null) throw Error("zipUnknownSize");
    bytes += size;
    if (bytes > memoryLimit) throw Error("zipTooLarge");
    files.push({ name: path, size, item });
  }
  const used = new Set<string>();
  for (const item of items) await append(item, "", used, []);
  if (!files.length) throw Error("zipSelect");
  const length = Number(
    predictLength(
      files.map(({ name, size, item }) => (item ? { name, size } : { name })),
    ),
  );
  if (length > memoryLimit) throw Error("zipTooLarge");
  return { files, length };
}
export async function writeSelectionZip(
  plan: Awaited<ReturnType<typeof planSelectionZip>>,
  resolve: ResolveProvider,
  signal: AbortSignal,
  progress: (bytes: number, total: number) => void,
) {
  const job = new AbortController();
  const stop = AbortSignal.any([signal, job.signal]);
  async function* entries() {
    for (const { item, name, size } of plan.files) {
      stop.throwIfAborted();
      if (!item) {
        yield { name };
        continue;
      }
      let bytes = 0;
      const stream = await streamReference(item, resolve, stop);
      const input = stream.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            bytes += chunk.byteLength;
            if (bytes > size) throw Error("transferSourceChanged");
            controller.enqueue(chunk);
          },
          flush() {
            if (bytes !== size) throw Error("transferSourceChanged");
          },
        }),
        { signal: stop },
      );
      yield { name, size, input };
    }
  }
  let written = 0;
  progress(0, plan.length);
  try {
    const zip = downloadZip(entries(), { length: plan.length });
    if (!zip.body) throw Error("zipFailed");
    const body = zip.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          written += chunk.byteLength;
          if (written > plan.length || written > ZIP_MEMORY_LIMIT)
            throw Error("zipTooLarge");
          controller.enqueue(chunk);
          progress(written, plan.length);
        },
      }),
      { signal: stop },
    );
    const result = await new Response(body, {
      headers: { "Content-Type": "application/zip" },
    }).blob();
    stop.throwIfAborted();
    return result;
  } finally {
    job.abort();
  }
}
