import type { HashKind, Hashes } from "./transferHash";

export function transferHash(
  blob: Blob,
  kinds: HashKind[],
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  return new Promise<Hashes>((resolve, reject) => {
    const worker = new Worker(
      new URL("./transferHash.worker.ts", import.meta.url),
      { type: "module" },
    );
    const fail = () =>
      finish(null, signal?.reason ?? Error("transferHashFailed"));
    function finish(hashes: Hashes | null, error?: unknown) {
      worker.terminate();
      signal?.removeEventListener("abort", fail);
      if (hashes) resolve(hashes);
      else reject(error ?? Error("transferHashFailed"));
    }
    signal?.addEventListener("abort", fail, { once: true });
    worker.onmessage = ({ data }: MessageEvent<Hashes | null>) => finish(data);
    worker.onerror = fail;
    try {
      worker.postMessage({ blob, kinds });
    } catch (error) {
      finish(null, error);
    }
  });
}
