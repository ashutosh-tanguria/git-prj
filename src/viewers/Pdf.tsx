/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Focusable reader region owns scoped PDF navigation shortcuts. */
import type { TextMatch } from "../services/textSearch";
import { PdfControls } from "./PdfControls";
import { usePdf } from "./usePdf";
import { PdfPage } from "./PdfPage";
import { PdfOutline } from "./PdfOutline";
import { t } from "../i18n";
import styles from "./Pdf.module.css";
export default function Pdf(props: {
  blob: Blob;
  fileKey: string;
  textMatch?: TextMatch;
}) {
  const reader = usePdf(props);
  const {
    positionRef,
    doc,
    position,
    setPosition,
    ready,
    error,
    sidebar,
    outline,
    query,
    inverted,
    host,
    search,
    jump,
    digits,
    go,
    zoom,
  } = reader;

  return (
    <section
      className={styles.reader}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).closest("input,select,textarea") ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        )
          return;
        if (e.key === "/") {
          e.preventDefault();
          const controls = search.current?.closest("details");
          if (controls) controls.open = true;
          search.current?.focus();
        } else if (e.key === "g") {
          jump.current = true;
          digits.current = "";
        } else if (jump.current && /^\d$/.test(e.key)) {
          digits.current += e.key;
        } else if (jump.current && e.key === "Enter") {
          go(Number(digits.current));
          jump.current = false;
        } else if (["j", "PageDown", "k", "PageUp", "+", "-"].includes(e.key)) {
          e.preventDefault();
          if (e.key === "+" || e.key === "-")
            zoom(position.zoom + (e.key === "+" ? 0.25 : -0.25));
          else go(position.page + (["j", "PageDown"].includes(e.key) ? 1 : -1));
        }
      }}
      tabIndex={0}
      aria-label={t("pdfReader")}
    >
      <PdfControls reader={reader} />

      {error && <p role="alert">{error}</p>}
      {!ready && !error && <p role="status">{t("loadingRead")}</p>}
      <div className={styles.layout}>
        {doc && sidebar !== "none" && (
          <aside aria-label={t(sidebar)} className={styles.sidebar}>
            {sidebar === "outline" ? (
              outline.length ? (
                <PdfOutline items={outline} doc={doc} onGo={go} />
              ) : (
                <p>{t("noOutline")}</p>
              )
            ) : (
              Array.from({ length: doc.numPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => go(i + 1)}
                  aria-label={t("pageNumber") + " " + (i + 1)}
                >
                  <PdfPage doc={doc} page={i + 1} scale={0.18} thumbnail />
                  <span>{i + 1}</span>
                </button>
              ))
            )}
          </aside>
        )}
        <div
          ref={host}
          tabIndex={0}
          role="region"
          aria-label={t("pdfPages")}
          className={styles.pages}
          data-reading={inverted}
        >
          {doc &&
            ready &&
            (position.mode === "single" ? (
              <PdfPage
                key={position.page}
                doc={doc}
                page={position.page}
                scale={position.zoom}
                query={query}
              />
            ) : (
              Array.from({ length: doc.numPages }, (_, i) => (
                <PdfPage
                  key={i}
                  doc={doc}
                  page={i + 1}
                  scale={position.zoom}
                  query={query}
                  onVisible={(page) => {
                    if (page !== positionRef.current.page)
                      setPosition((p) => ({ ...p, page }));
                  }}
                />
              ))
            ))}
        </div>
      </div>
    </section>
  );
}
