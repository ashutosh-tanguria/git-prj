import { PDFDocument, PDFName } from "pdf-lib";
import { expect, it } from "vitest";
import { splitPdf } from "../src/services/pdfSplit";
import { PDF_INPUT_BYTES } from "../src/services/pdfSplitLimits";

async function generatedPdf(pagePayloads: number[]) {
  const document = await PDFDocument.create();
  pagePayloads.forEach((bytes, index) => {
    const page = document.addPage([300 + index, 400]);
    const content = document.context.stream(
      "0 0 m\n% " + "x".repeat(bytes) + "\n",
    );
    page.node.set(PDFName.of("Contents"), document.context.register(content));
  });
  return new Blob([new Uint8Array(await document.save())], { type: "application/pdf" });
}

it("splits generated pages in order and measures every serialized part", async () => {
  const input = await generatedPdf([2300, 2300, 40, 60, 2300]);
  const original = await input.arrayBuffer();
  const progress: number[] = [];
  const limit = 3700;
  const parts = await splitPdf(input, "source.PDF", limit, (done) =>
    progress.push(done),
  );
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.map((part) => part.name)).toEqual(
    parts.map((_, index) => `source.part${index + 1}.pdf`),
  );
  const widths: number[] = [];
  for (const part of parts) {
    expect(part.size).toBeLessThanOrEqual(limit);
    expect(part.type).toBe("application/pdf");
    const document = await PDFDocument.load(await part.arrayBuffer());
    widths.push(...document.getPages().map((page) => page.getWidth()));
  }
  expect(widths).toEqual([300, 301, 302, 303, 304]);
  expect(progress.at(-1)).toBe(5);
  expect(await input.arrayBuffer()).toEqual(original);
});

it("fails the entire split if a single page exceeds the limit", async () => {
  const input = await generatedPdf([10, 5000, 10]);
  await expect(splitPdf(input, "large.pdf", 3900)).rejects.toThrow(
    "splitPdfOversizedPage",
  );
});

it("refuses a PDF over 300 MiB before reading it", async () => {
  class TooLarge extends Blob {
    override get size() {
      return PDF_INPUT_BYTES + 1;
    }
    override async arrayBuffer(): Promise<ArrayBuffer> {
      throw Error("read unexpectedly");
    }
  }
  await expect(splitPdf(new TooLarge(), "large.pdf")).rejects.toThrow(
    "splitPdfTooLarge",
  );
});
