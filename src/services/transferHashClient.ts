import type { HashKind, Hashes } from "./transferHash";

export function transferHash(
  blob: Blob,
  kinds: HashKind[],
  signal?: AbortSignal,
) {
  return runHashWorker({ blob, kinds }, [], signal);
}
export async function transferSha256Stream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
) {
  const hashes = await runHashWorker({ stream }, [stream], signal);
  if (!hashes.sha256) throw Error("transferHashFailed");
  return hashes.sha256;
}
function runHashWorker(
  data:
    { blob: Blob; kinds: HashKind[] } | { stream: ReadableStream<Uint8Array> },
  transfer: Transferable[],
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
      worker.postMessage(data, transfer);
    } catch (error) {
      finish(null, error);
    }
  });
}
