import type { CSSProperties } from "react";
import type { Entry } from "../services/library";
import { useFileTable } from "./useFileTable";
import { FileRow } from "./FileRow";
import { TableHeader, ColumnChooser, columns } from "./TableHeader";
import { t } from "../i18n";
import styles from "./Table.module.css";
export function FileTable(props: {
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onPreview: (entry: Entry, rows?: Entry[]) => void;
  onSelectionChange?: (entries: Entry[]) => void;
  locationKey?: string;
}) {
  const table = useFileTable(props);
  const {
    parent,
    box,
    selected,
    layout,
    setLayout,
    mode,
    setMode,
    rows,
    virtual,
    selectedEntries,
    choose,
    touchTimer,
    focused,
    template,
  } = table;
  const { onOpen } = props;
  const setFocused = table.setFocused;
  return (
    <section
      className={styles.tableSection}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[role="columnheader"]')) {
          e.preventDefault();
          const chooser = e.currentTarget.querySelector("details");
          if (chooser) {
            chooser.open = true;
            chooser.querySelector<HTMLInputElement>("input")?.focus();
          }
        }
      }}
    >
      <div className={styles.tools}>
        <button
          type="button"
          onClick={() => setMode(!mode)}
          aria-pressed={mode}
        >
          {t("selectionMode")}
        </button>
        {mode && selectedEntries.length === 1 && (
          <>
            <button onClick={() => props.onOpen(selectedEntries[0])}>
              {t("open")}
            </button>
            <button onClick={() => props.onPreview(selectedEntries[0], rows)}>
              {t("quickLook")}
            </button>
          </>
        )}
        <span role="status" aria-live="polite">
          {t("selectedCount")} {selectedEntries.length}
        </span>
      </div>
      <ColumnChooser
        hidden={layout.hidden}
        onHidden={(hidden) => setLayout({ ...layout, hidden })}
      />
      <div
        ref={parent}
        role="grid"
        aria-label={t("files")}
        aria-multiselectable="true"
        aria-rowcount={rows.length + 1}
        aria-colcount={
          innerWidth < 640 ? 3 : columns.length + 1 - layout.hidden.length
        }
        className={styles.grid}
        tabIndex={-1}
        style={{ "--table-columns": template } as CSSProperties}
        onKeyDown={table.onKeyDown}
        onPointerDown={table.onPointerDown}
        onPointerMove={table.onPointerMove}
        onPointerUp={table.onPointerUp}
      >
        <TableHeader
          {...layout}
          onSort={(sort) =>
            setLayout({
              ...layout,
              sort,
              reverse: layout.sort === sort ? !layout.reverse : false,
            })
          }
          onResize={(i, width) =>
            setLayout({
              ...layout,
              widths: layout.widths.map((v, j) =>
                i === j ? Math.max(80, Math.min(700, width)) : v,
              ),
            })
          }
          onHidden={(hidden) => setLayout({ ...layout, hidden })}
        />
        <div
          data-rows
          className={styles.rows}
          style={{ height: Math.max(virtual.getTotalSize(), 400) }}
        >
          {virtual.getVirtualItems().map((item) => (
            <FileRow
              key={rows[item.index].ref}
              onMetadata={(ref, value) =>
                table.setMetadata((old) => ({ ...old, [ref]: value }))
              }
              entry={rows[item.index]}
              index={item.index}
              top={item.start}
              height={item.size}
              selected={selected.includes(rows[item.index].ref)}
              focused={focused === item.index}
              hidden={layout.hidden}
              onChoose={choose}
              onFocus={setFocused}
              onOpen={onOpen}
              onTouchStart={() => {
                touchTimer.current = setTimeout(() => {
                  setMode(true);
                  choose(item.index, true);
                  table.suppressClick.current = true;
                }, 450);
              }}
              onTouchEnd={() => clearTimeout(touchTimer.current)}
            />
          ))}
        </div>
        {box && (
          <div
            data-selection-box
            aria-hidden="true"
            className={styles.box}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          />
        )}
      </div>
      {!rows.length && <p>{t("emptyFolder")}</p>}
    </section>
  );
}
