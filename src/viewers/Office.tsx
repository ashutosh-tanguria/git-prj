/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The focusable viewer scopes document shortcuts. */
import "../i18n/office";
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { startOfficeSession } from "../services/officeSession";
import { OfficeToolbar } from "./OfficeToolbar";
import styles from "./Office.module.css";

export default function Office({ blob, name }: { blob: Blob; name: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const help = useRef<HTMLDetailsElement>(null);
  const session = useRef<ReturnType<typeof startOfficeSession>>(undefined);
  const shortcut = useRef<(key: string) => void>(() => {});
  const [status, setStatus] = useState("officeLoading");
  const [sheets, setSheets] = useState<{ name: string; truncated: boolean }[]>(
    [],
  );
  const [sheet, setSheet] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const supported = /\.(docx|xlsx|pptx)$/i.test(name);
  const limit = blob.size > 50 * 1024 * 1024;
  const ready = supported && !limit && !status;
  const changePage = (value: number) => {
    const next = Math.max(1, Math.min(pages, value));
    setPage(next);
    session.current?.command("page", next - 1);
  };
  const changeZoom = (value: number) => {
    const next = Math.max(25, Math.min(400, value));
    setZoom(next);
    session.current?.command("zoom", next);
  };
  shortcut.current = (key) => {
    if (key === "?") {
      if (help.current) {
        help.current.open = true;
        help.current.querySelector("summary")?.focus();
      }
    } else if (ready) {
      const levels = [25, 50, 75, 100, 125, 150, 200, 300, 400];
      if (key === "+" || key === "=")
        changeZoom(levels.find((value) => value > zoom) || 400);
      if (key === "-")
        changeZoom(levels.filter((value) => value < zoom).at(-1) || 25);
      if (key === "0") changeZoom(100);
      if (!sheets.length && ["j", "PageDown"].includes(key))
        changePage(page + 1);
      if (!sheets.length && ["k", "PageUp"].includes(key)) changePage(page - 1);
    }
  };
  useEffect(() => {
    if (!supported || limit || !frame.current) return;
    setStatus("officeLoading");
    setSheets([]);
    setSheet(0);
    setPage(1);
    setPages(1);
    setZoom(100);
    try {
      const origin =
        import.meta.env.VITE_SANDBOX_ORIGIN ||
        (__STYLEGUIDE__
          ? "http://127.0.0.1:4174"
          : import.meta.env.DEV
            ? "http://127.0.0.1:5174"
            : "");
      session.current = startOfficeSession(
        frame.current,
        origin,
        name,
        blob,
        (event) => {
          if (event.type === "shortcut") {
            shortcut.current(event.key);
            return;
          }
          if (event.type === "error") {
            session.current?.();
            session.current = undefined;
          }
          setStatus(event.type === "rendered" ? "" : "office" + event.code);
          if (event.type === "rendered") {
            setSheets(event.sheets);
            setPages(event.pages);
          }
        },
      );
    } catch {
      setStatus("officeUnavailable");
    }
    return () => {
      session.current?.();
      session.current = undefined;
    };
  }, [blob, name, supported, limit]);
  return (
    <section
      className={styles.office}
      data-office-viewer
      tabIndex={0}
      aria-label={t("officeTitle")}
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "input,select,textarea,button,a",
          ) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (
          ["+", "=", "-", "0", "j", "k", "PageDown", "PageUp", "?"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.current(event.key);
        }
      }}
    >
      <OfficeToolbar
        panelId="office-sheet-panel"
        zoom={zoom}
        page={page}
        pages={pages}
        slides={/\.pptx$/i.test(name)}
        sheets={sheets}
        sheet={sheet}
        ready={ready}
        onZoom={changeZoom}
        onPage={changePage}
        onSheet={(index) => {
          setSheet(index);
          session.current?.command("sheet", index);
        }}
      />
      <p>
        {name} | {new Intl.NumberFormat().format(blob.size)} {t("officeBytes")}
      </p>
      <p>{t("officeUntrusted")}</p>
      {/\.pptx$/i.test(name) && <p>{t("officeFidelity")}</p>}
      {!!sheets.length && (
        <p>
          {t("officeColumns")} {t("officeFormula")}
        </p>
      )}
      {sheets[sheet]?.truncated && <p role="status">{t("officeRows")}</p>}
      <details ref={help}>
        <summary>{t("officeHelp")}</summary>
        <p>{t("officeShortcuts")}</p>
      </details>
      {(!supported || limit || status) && (
        <p role="status">
          {t(!supported ? "officeUnsupported" : limit ? "officelimit" : status)}
        </p>
      )}
      {supported && !limit && (
        <iframe
          hidden={!!status && status !== "officeLoading"}
          id="office-sheet-panel"
          ref={frame}
          title={t("officeTitle")}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'"
        />
      )}
    </section>
  );
}
