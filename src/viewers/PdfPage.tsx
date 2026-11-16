import { highlightMatches } from "./highlight";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TextLayer, type PDFDocumentProxy } from "pdfjs-dist";
import styles from "./Pdf.module.css";
import { t } from "../i18n";
export function PdfPage({
  doc,
  page,
  scale,
  thumbnail = false,
  query = "",
  onVisible,
}: {
  doc: PDFDocumentProxy;
  page: number;
  scale: number;
  thumbnail?: boolean;
  query?: string;
  onVisible?: (page: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    text = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<string | null>(null);
  const oldScale = useRef(scale);
  const [active, setActive] = useState(false),
    [size, setSize] = useState({ width: 612 * scale, height: 792 * scale }),
    [error, setError] = useState("");
  const frameKey = page + ":" + scale + ":" + query + ":" + active;
  const visibleCallback = useRef(onVisible);
  visibleCallback.current = onVisible;
  useEffect(() => {
    setSize((old) => ({
      width: (old.width / oldScale.current) * scale,
      height: (old.height / oldScale.current) * scale,
    }));
    oldScale.current = scale;
  }, [scale]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        setActive(records[0].isIntersecting);
      },
      { rootMargin: thumbnail ? "200px" : "700px" },
    );
    if (host.current) observer.observe(host.current);
    const current = new IntersectionObserver(
      (records) => {
        if (records[0].isIntersecting && !thumbnail)
          visibleCallback.current?.(page);
      },
      { threshold: 0.25 },
    );
    if (host.current) current.observe(host.current);
    return () => {
      observer.disconnect();
      current.disconnect();
    };
  }, [page, thumbnail]);
  useEffect(() => {
    let cancelled = false;
    let cancel = () => {};
    let release = () => {};
    setError("");
    setRendered(null);
    if (!active) {
      if (canvas.current) {
        canvas.current.width = 0;
        canvas.current.height = 0;
      }
      text.current?.replaceChildren();
      return;
    }
    void doc
      .getPage(page)
      .then(async (pdfPage) => {
        if (cancelled) return;
        release = () => {
          pdfPage.cleanup();
        };
        const viewport = pdfPage.getViewport({ scale });
        setSize({ width: viewport.width, height: viewport.height });
        const el = canvas.current;
        if (!el) return;
        el.width = viewport.width;
        el.height = viewport.height;
        const render = pdfPage.render({ canvas: el, viewport });
        cancel = () => {
          render.cancel();
          void render.promise.catch(() => {}).then(release);
        };
        await render.promise;
        if (cancelled) return;
        if (thumbnail || !text.current) {
          setRendered(frameKey);
          return;
        }
        const content = await pdfPage.getTextContent();
        if (cancelled) return;
        const layer = new TextLayer({
          textContentSource: content,
          container: text.current,
          viewport,
        });
        cancel = () => layer.cancel();
        await layer.render();
        if (!cancelled) {
          if (query) highlightMatches(text.current, query);
          setRendered(frameKey);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("readError"));
      });
    return () => {
      cancelled = true;
      cancel();
      release();
      if (canvas.current) {
        canvas.current.width = 0;
        canvas.current.height = 0;
      }
      text.current?.replaceChildren();
    };
  }, [doc, page, scale, active, thumbnail, query]);
  return (
    <div
      ref={host}
      data-pdf-page={thumbnail ? undefined : page}
      data-rendered={active && rendered === frameKey}
      className={styles.page}
      style={
        {
          width: size.width,
          height: size.height,
          "--scale-factor": scale,
          "--total-scale-factor": scale,
        } as CSSProperties
      }
    >
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <canvas
            ref={canvas}
            aria-label={thumbnail ? t("thumbnail") + " " + page : t("pdfPage")}
          />
          {!thumbnail && <div ref={text} className={styles.textLayer} />}
        </>
      )}
    </div>
  );
}
