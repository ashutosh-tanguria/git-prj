import { PDFDocument } from "pdf-lib";
import { checkPdfSplitSize, PDF_PART_BYTES } from "./pdfSplitLimits";

export async function splitPdf(
  input: Blob,
  name: string,
  limit = PDF_PART_BYTES,
  onProgress?: (finishedPages: number, totalPages: number) => void,
) {
  checkPdfSplitSize(input.size);
  const source = await PDFDocument.load(await input.arrayBuffer(), {
    updateMetadata: false,
  });
  const total = source.getPageCount();
  if (!total) throw Error("splitPdfInvalid");
  const parts: File[] = [];
  const basename = name.replace(/\.pdf$/i, "");
  const bytesPerPage = Math.max(1, input.size / total);
  const estimated = Math.max(1, Math.floor(limit / bytesPerPage));
  const encode = async (start: number, count: number) => {
    const target = await PDFDocument.create();
    const pages = await target.copyPages(
      source,
      Array.from({ length: count }, (_, offset) => start + offset),
    );
    for (const page of pages) target.addPage(page);
    const bytes = await target.save();
    // pdf-lib allocates an ordinary ArrayBuffer for serialization.
    return new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
  };
  for (let start = 0; start < total;) {
    let count = Math.min(estimated, total - start);
    let bytes = await encode(start, count);
    let upper = total - start;
    while (bytes.byteLength > limit) {
      if (count === 1) throw Error("splitPdfOversizedPage");
      upper = count - 1;
      count = Math.max(
        1,
        Math.min(count - 1, Math.floor((count * limit) / bytes.byteLength)),
      );
      bytes = await encode(start, count);
    }
    // The source estimate may be low for pages that share embedded resources.
    let step = count;
    while (upper > count) {
      const next = Math.min(count + step, upper);
      const candidate = await encode(start, next);
      if (candidate.byteLength <= limit) {
        count = next;
        bytes = candidate;
        step *= 2;
      } else {
        upper = next - 1;
        step = Math.max(1, Math.ceil((upper - count) / 2));
      }
    }
    parts.push(
      new File([bytes], `${basename}.part${parts.length + 1}.pdf`, {
        type: "application/pdf",
      }),
    );
    start += count;
    onProgress?.(start, total);
  }
  return parts;
}
