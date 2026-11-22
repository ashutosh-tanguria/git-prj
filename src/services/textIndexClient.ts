import type { IndexJob, IndexResult } from "./textIndexTypes";

export function textIndexJob(job: IndexJob, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<Exclude<IndexResult, { type: "error" }>>(
    (resolve, reject) => {
      const worker = new Worker(
        new URL("./textIndex.worker.ts", import.meta.url),
        { type: "module" },
      );
      const dispose = () => {
        worker.terminate();
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        dispose();
        reject(signal.reason);
      };
      const failed = (error: unknown) => {
        dispose();
        reject(error);
      };
      worker.onerror = () => failed(Error("indexFailed"));
      worker.onmessage = ({ data }: MessageEvent<IndexResult>) => {
        if (data.type === "error") failed(Error("indexFailed"));
        else {
          dispose();
          resolve(data);
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      try {
        worker.postMessage(job);
      } catch (error) {
        failed(error);
      }
    },
  );
}
