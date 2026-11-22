import { checkPdfSplitSize } from "./pdfSplitLimits";

type Result =
  { parts: File[] } | { error: string } | { done: number; total: number };
export function splitPdfInWorker(
  file: Blob,
  name: string,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
) {
  checkPdfSplitSize(file.size);
  signal.throwIfAborted();
  return new Promise<File[]>((resolve, reject) => {
    const worker = new Worker(
      new URL("./pdfSplit.worker.ts", import.meta.url),
      { type: "module" },
    );
    const dispose = () => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      dispose();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      dispose();
      reject(Error("splitPdfInvalid"));
    };
    worker.onmessage = ({ data }: MessageEvent<Result>) => {
      if ("done" in data) {
        progress(data.done, data.total);
        return;
      }
      dispose();
      if ("parts" in data) resolve(data.parts);
      else reject(Error(data.error));
    };
    try {
      worker.postMessage({ file, name });
    } catch (error) {
      dispose();
      reject(error);
    }
  });
}
