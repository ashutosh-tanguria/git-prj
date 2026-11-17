/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- WAI-ARIA focusable separator implements keyboard column resizing. */
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Table.module.css";
export const columns = ["name", "modified", "fileType", "size", "lastChange"] as const;
export type Column = (typeof columns)[number];
export function TableHeader({
  widths,
  sort,
  reverse,
  onSort,
  onResize,
  hidden,
}: {
  widths: number[];
  sort: Column;
  reverse: boolean;
  onSort: (column: Column) => void;
  onResize: (index: number, width: number) => void;
  hidden: Column[];
  onHidden: (hidden: Column[]) => void;
}) {
  return (
    <>
      <div role="row" className={styles.header}>
        <div role="columnheader" aria-label={t("selection")} />
        {columns.map(
          (column, index) =>
            !hidden.includes(column) && (
              <div
                key={column}
                role="columnheader"
                aria-sort={
                  sort === column
                    ? reverse
                      ? "descending"
                      : "ascending"
                    : "none"
                }
              >
                <Button variant="quiet" onPress={() => onSort(column)}>
                  {t(column)}
                </Button>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={t("resize") + " " + t(column)}
                  aria-valuemin={80}
                  aria-valuemax={700}
                  aria-valuenow={widths[index]}
                  tabIndex={0}
                  className={styles.resize}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      onResize(
                        index,
                        widths[index] + (e.key === "ArrowRight" ? 8 : -8),
                      );
                    }
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    e.currentTarget.dataset.start = String(e.clientX);
                    e.currentTarget.dataset.width = String(widths[index]);
                  }}
                  onPointerMove={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                      onResize(
                        index,
                        Number(e.currentTarget.dataset.width) +
                          e.clientX -
                          Number(e.currentTarget.dataset.start),
                      );
                  }}
                />
              </div>
            ),
        )}
      </div>
    </>
  );
}

export function ColumnChooser({
  hidden,
  onHidden,
}: {
  hidden: Column[];
  onHidden: (hidden: Column[]) => void;
}) {
  return (
    <details
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>{t("columns")}</summary>
      <div className={styles.columnOptions}>
        {columns.slice(1).map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={!hidden.includes(c)}
              onChange={() =>
                onHidden(
                  hidden.includes(c)
                    ? hidden.filter((x) => x !== c)
                    : [...hidden, c],
                )
              }
            />
            {t(c)}
          </label>
        ))}
      </div>
    </details>
  );
}
