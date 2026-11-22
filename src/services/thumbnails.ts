import { cacheData, cacheRequest } from "./cacheData";
import { itemKey, type LibraryItem } from "./organizer";
import { readReference } from "./referenceRead";
import type { ResolveProvider } from "./transferTypes";

export const thumbnailWidths = [120, 160, 200] as const;
const thumbnailLimit = 24 * 1024 * 1024;
let queue: Promise<unknown> = Promise.resolve();
export function thumbnailKind(name: string) {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(?:avif|webp|png|gif|jpe?g|bmp|ico)$/i.test(name)) return "image";
}

function renderPdf(bytes: Blob, limit: number, signal: AbortSignal) {
  return new Promise<Blob | undefined>((resolve) => {
    const worker = new Worker(
      new URL("./thumbnail.worker.ts", import.meta.url),
      { type: "module" },
    );
    function finish(image?: Blob) {
      worker.terminate();
      signal.removeEventListener("abort", abort);
      resolve(image);
    }
    const abort = () => finish();
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<Blob | null>) =>
      finish(data ?? undefined);
    worker.onerror = abort;
    worker.postMessage({ bytes, limit });
  });
}
async function downscale(bytes: Blob, limit: number) {
  const image = await createImageBitmap(bytes);
  try {
    const scale = Math.min(1, limit / Math.max(image.width, image.height));
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
  } finally {
    image.close();
  }
}
export function loadThumbnail(
  item: LibraryItem,
  width: number,
  resolve: ResolveProvider,
  signal: AbortSignal,
) {
  const kind = thumbnailKind(item.entry.name);
  if (
    !kind ||
    item.entry.kind !== "file" ||
    item.entry.size == null ||
    item.entry.size > thumbnailLimit
  )
    return Promise.resolve(undefined);
  const task = queue
    .then(async () => {
      signal.throwIfAborted();
      const key = JSON.stringify([itemKey(item), item.entry.version, width]);
      const cached =
        item.entry.version &&
        (await cacheData.get<Blob>("thumbnails", key).catch(() => undefined));
      if (cached) return cached;
      const bytes = await readReference(item, resolve, signal);
      signal.throwIfAborted();
      if (bytes.size > thumbnailLimit) return;
      const result = await (kind === "pdf"
        ? renderPdf(bytes, width, signal)
        : downscale(bytes, width));
      signal.throwIfAborted();
      if (result && item.entry.version) {
        await cacheData
          .put("thumbnails", key, result)
          .then(async () => {
            const keys = await cacheRequest("thumbnails", "readonly", (store) =>
              store.getAllKeys(),
            );
            for (const old of keys
              .filter((old) => old !== key)
              .slice(0, Math.max(0, keys.length - 256)))
              await cacheData.remove("thumbnails", String(old));
          })
          .catch(() => {});
      }
      return result;
    })
    .catch(() => undefined);
  queue = task;
  return task;
}
