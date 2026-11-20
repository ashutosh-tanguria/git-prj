export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
  truncated: boolean;
}

export function parseSpreadsheet(
  bytes: ArrayBuffer,
): Promise<SpreadsheetSheet[]> {
  if (bytes.byteLength > 50 * 1024 * 1024)
    return Promise.reject(Error("limit"));
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./spreadsheet.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    const timeout = setTimeout(() => finish(Error("timeout")), 20_000);
    function finish(error?: Error, sheets?: SpreadsheetSheet[]) {
      clearTimeout(timeout);
      worker.terminate();
      if (error) reject(error);
      else resolve(sheets || []);
    }
    worker.onmessage = (
      event: MessageEvent<{ error?: string; sheets?: SpreadsheetSheet[] }>,
    ) => {
      if (event.data.error) finish(Error(event.data.error));
      else finish(undefined, event.data.sheets);
    };
    worker.onerror = () => finish(Error("corrupt"));
    worker.postMessage(bytes, [bytes]);
  });
}
