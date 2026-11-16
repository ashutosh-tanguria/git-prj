import { useState, useEffect, useRef } from "react";
import type { usePdf } from "./usePdf";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { t } from "../i18n";
import styles from "./Pdf.module.css";
export function PdfControls({ reader }: { reader: ReturnType<typeof usePdf> }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(
    () => !matchMedia("(width < 640px), (height < 700px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(width < 640px), (height < 700px)"),
      change = () => setExpanded(!query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const {
    doc,
    position,
    setPosition,
    sidebar,
    setSidebar,
    inverted,
    setInverted,
    query,
    setQuery,
    search,
    matches,
    match,
    setMatch,
    searching,
    go,
    zoom,
    fit,
    find,
  } = reader;
  return (
    <details
      className={styles.disclosure}
      ref={disclosure}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>{t("pdfControls")}</summary>
      <div className={styles.controls}>
        <Button
          onPress={() => go(position.page - 1)}
          isDisabled={position.page <= 1}
        >
          {t("previous")}
        </Button>
        <Input
          label={t("pageNumber")}
          type="number"
          min={1}
          max={doc?.numPages || 1}
          value={position.page}
          onChange={(e) => go(Number(e.target.value) || 1)}
        />
        <span> / {doc?.numPages || 1}</span>
        <Button
          onPress={() => go(position.page + 1)}
          isDisabled={!doc || position.page >= doc.numPages}
        >
          {t("next")}
        </Button>
        <Button onPress={() => zoom(position.zoom - 0.25)}>
          {t("zoomOut")}
        </Button>
        <Input
          label={t("zoom")}
          type="number"
          min={25}
          max={400}
          value={Math.round(position.zoom * 100)}
          onChange={(e) => zoom(Number(e.target.value) / 100)}
        />
        <Button onPress={() => zoom(position.zoom + 0.25)}>
          {t("zoomIn")}
        </Button>
        <Button
          isDisabled={!reader.ready}
          onPress={() => {
            if (matchMedia("(width < 640px), (height < 700px)").matches)
              setExpanded(false);
            requestAnimationFrame(() => {
              void fit("width");
              if (matchMedia("(width < 640px), (height < 700px)").matches)
                disclosure.current?.querySelector("summary")?.focus();
            });
          }}
        >
          {t("fitWidth")}
        </Button>
        <Button
          onPress={() => {
            if (matchMedia("(width < 640px), (height < 700px)").matches)
              setExpanded(false);
            requestAnimationFrame(() => {
              void fit("page");
              if (matchMedia("(width < 640px), (height < 700px)").matches)
                disclosure.current?.querySelector("summary")?.focus();
            });
          }}
        >
          {t("fitPage")}
        </Button>
        <Select
          label={t("pageMode")}
          value={position.mode}
          onChange={(e) => setPosition({ ...position, mode: e.target.value })}
          options={["single", "continuous"].map((value) => ({
            value,
            label: t(value),
          }))}
        />
        <Select
          label={t("pdfSidebar")}
          value={sidebar}
          onChange={(e) => setSidebar(e.target.value)}
          options={["none", "thumbnails", "outline"].map((value) => ({
            value,
            label: t(value),
          }))}
        />
        <Button selected={inverted} onPress={() => setInverted(!inverted)}>
          {t("readingMode")}
        </Button>
      </div>
      <form
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label>
          {t("searchPdf")}
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button type="submit">{t("find")}</Button>
        <span role="status">
          {searching
            ? t("searching")
            : matches.length + " " + t("matchingPages")}
        </span>
        <Button
          isDisabled={!matches.length}
          onPress={() => {
            const i = (match - 1 + matches.length) % matches.length;
            setMatch(i);
            go(matches[i]);
          }}
        >
          {t("previousMatch")}
        </Button>
        <Button
          isDisabled={!matches.length}
          onPress={() => {
            const i = (match + 1) % matches.length;
            setMatch(i);
            go(matches[i]);
          }}
        >
          {t("nextMatch")}
        </Button>
      </form>
    </details>
  );
}
