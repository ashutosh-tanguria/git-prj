import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Entry } from "../services/library";
import { Button } from "../ui/Button";
import { FileGlyph } from "../ui/FileGlyph";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function FileTable({
  entries,
  onOpen,
  onPreview,
}: {
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onPreview: (entry: Entry) => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [reverse, setReverse] = useState(false);
  const rows = [...entries].sort(
    (a, b) =>
      Number(b.kind === "dir") -
      Number(a.kind === "dir") +
      (a.kind === b.kind
        ? (reverse ? -1 : 1) * a.name.localeCompare(b.name)
        : 0),
  );
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => 44,
    overscan: 6,
  });
  return (
    <section>
      <Button onPress={() => setReverse(!reverse)}>{t("sort")}</Button>
      <div
        role="grid"
        aria-label={t("files")}
        aria-rowcount={rows.length}
        ref={parent}
        className={styles.table}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.max(
              0,
              Math.min(
                rows.length - 1,
                selected + (e.key === "ArrowDown" ? 1 : -1),
              ),
            );
            setSelected(next);
            virtual.scrollToIndex(next);
          }
          if (rows[selected] && e.key === "Enter") {
            e.preventDefault();
            onOpen(rows[selected]);
          }
          if (rows[selected] && e.key === " ") {
            e.preventDefault();
            onPreview(rows[selected]);
          }
        }}
      >
        <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {virtual.getVirtualItems().map((item) => {
            const row = rows[item.index];
            return (
              <div
                role="row"
                aria-rowindex={item.index + 1}
                aria-selected={selected === item.index}
                key={row.path}
                className={styles.row}
                style={{
                  position: "absolute",
                  top: item.start,
                  height: item.size,
                  width: "100%",
                }}
              >
                <div role="gridcell">
                  <input
                    type="checkbox"
                    aria-label={row.name}
                    checked={selected === item.index}
                    onChange={() => setSelected(item.index)}
                  />
                </div>
                <div role="gridcell">
                  <FileGlyph
                    folder={row.kind === "dir"}
                    extension={row.name
                      .split(".")
                      .at(-1)
                      ?.toUpperCase()
                      .slice(0, 4)}
                  />
                  <Button
                    variant="quiet"
                    onPress={() => onOpen(row)}
                    isDisabled={row.kind === "special"}
                  >
                    {row.name}
                  </Button>
                </div>
                <div role="gridcell" className={styles.size}>
                  {row.kind === "file"
                    ? new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 1,
                      }).format(row.size / 1048576) + " MB"
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!rows.length && <p>{t("emptyFolder")}</p>}
    </section>
  );
}
