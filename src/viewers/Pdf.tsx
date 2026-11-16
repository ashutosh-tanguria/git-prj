import styles from "./Viewer.module.css";
import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, TextLayer } from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "../ui/Button";
import { t } from "../i18n";
GlobalWorkerOptions.workerSrc = worker;
export default function Pdf({ blob }: { blob: Blob }) {
  const textLayer = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.2);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const task = blob.arrayBuffer().then((bytes) =>
      getDocument(
        Object.assign({
          data: new Uint8Array(bytes),
          isEvalSupported: false,
          disableFontFace: true,
          useWasm: false,
        }),
      ),
    );
    let cleanup = () => {};
    void task
      .then(async (loading) => {
        cleanup = () => {
          void loading.destroy();
        };
        const doc = await loading.promise;
        if (cancelled) {
          cleanup();
          return;
        }
        setCount(doc.numPages);
        const pdfPage = await doc.getPage(page);
        const viewport = pdfPage.getViewport({ scale: zoom });
        const el = canvas.current;
        if (!el || cancelled) return;
        el.width = viewport.width;
        el.height = viewport.height;
        await pdfPage.render({ canvas: el, viewport }).promise;
        if (textLayer.current && !cancelled) {
          textLayer.current.replaceChildren();
          await new TextLayer({
            textContentSource: await pdfPage.getTextContent(),
            container: textLayer.current,
            viewport,
          }).render();
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("readError"));
      });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [blob, page, zoom]);
  return (
    <section>
      <Button onPress={() => setPage(Math.max(1, page - 1))}>
        {t("previous")}
      </Button>
      <Button onPress={() => setZoom(Math.max(0.25, zoom - 0.25))}>
        {t("zoomOut")}
      </Button>
      <Button onPress={() => setZoom(Math.min(4, zoom + 0.25))}>
        {t("zoomIn")}
      </Button>
      <span>
        {page} / {count}
      </span>
      <Button onPress={() => setPage(Math.min(count, page + 1))}>
        {t("next")}
      </Button>
      {error && <p role="alert">{error}</p>}
      <div className={styles.pdfPage}>
        <canvas
          ref={canvas}
          aria-label={t("pdfPage")}
          style={{ maxWidth: "100%" }}
        />
        <div ref={textLayer} className={styles.textLayer} />
      </div>
    </section>
  );
}
