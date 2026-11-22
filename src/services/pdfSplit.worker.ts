import { splitPdf } from "./pdfSplit";

self.onmessage = async ({
  data,
}: MessageEvent<{ file: Blob; name: string }>) => {
  try {
    const parts = await splitPdf(
      data.file,
      data.name,
      undefined,
      (done, total) => {
        self.postMessage({ done, total });
      },
    );
    self.postMessage({ parts });
  } catch (error) {
    const key = (error as Error).message;
    self.postMessage({
      error: key.startsWith("splitPdf") ? key : "splitPdfInvalid",
    });
  }
};
