import type { TextPage } from "./textSearch";
import { normalizeText } from "./textSearch";

export async function extractPages(blob: Blob): Promise<TextPage[]> {
  const [{ getDocument, PDFWorker }, { default: worker }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  const data = new Uint8Array(await blob.arrayBuffer());
  const port = new Worker(worker, { type: "module" });
  const pdfWorker = PDFWorker.create({ port });
  const task = getDocument({
    data,
    worker: pdfWorker,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
  });
  try {
    const doc = await task.promise;
    const pages: TextPage[] = [];
    for (let id = 1; id <= doc.numPages; id++) {
      const page = await doc.getPage(id);
      const content = await page.getTextContent();
      const text = normalizeText(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      );
      pages.push({ id, text });
      page.cleanup();
    }
    return pages;
  } finally {
    try {
      await task.destroy();
    } finally {
      pdfWorker.destroy();
      port.terminate();
    }
  }
}
