import { getDocument, PDFWorker } from "pdfjs-dist";
import pdfPort from "pdfjs-dist/build/pdf.worker.min.mjs?url";

class OffscreenFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw Error("thumbnailCanvas");
    return { canvas, context };
  }
  reset(
    { canvas }: { canvas: OffscreenCanvas },
    width: number,
    height: number,
  ) {
    canvas.width = width;
    canvas.height = height;
  }
  destroy(target: {
    canvas: OffscreenCanvas | null;
    context: OffscreenCanvasRenderingContext2D | null;
  }) {
    if (target.canvas) this.reset({ canvas: target.canvas }, 0, 0);
    target.canvas = null;
    target.context = null;
  }
}

async function render(bytes: Blob, limit: number) {
  const port = new Worker(pdfPort, { type: "module" });
  const pdfWorker = PDFWorker.create({ port });
  const task = getDocument({
    data: new Uint8Array(await bytes.arrayBuffer()),
    worker: pdfWorker,
    CanvasFactory: OffscreenFactory,
    disableFontFace: true,
    useWasm: false,
    useSystemFonts: false,
    maxImageSize: 16_000_000,
    disableWorkerRendering: true,
  });
  try {
    const page = await (await task.promise).getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: limit / Math.max(base.width, base.height),
    });
    const { canvas, context } = new OffscreenFactory().create(
      Math.max(1, Math.ceil(viewport.width)),
      Math.max(1, Math.ceil(viewport.height)),
    );
    // PDF.js accepts a supplied 2D context with a null canvas for worker rendering.
    await page.render({
      canvas: null,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
  } finally {
    try {
      await task.destroy();
    } finally {
      pdfWorker.destroy();
      port.terminate();
    }
  }
}

self.onmessage = ({ data }: MessageEvent<{ bytes: Blob; limit: number }>) => {
  void render(data.bytes, data.limit).then(
    (image) => self.postMessage(image),
    () => self.postMessage(null),
  );
};
