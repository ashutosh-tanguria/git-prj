import { Meter } from "../ui/Meter";
import { relativeTime } from "../lib/time";
import { library } from "../services/library";
import type { EntryMetadata } from "../services/metadata";
import { useRef, useEffect, useState } from "react";
import type { Entry } from "../services/library";
import type { Column } from "./TableHeader";
import { FileGlyph } from "../ui/FileGlyph";
import { t } from "../i18n";
import styles from "./Table.module.css";
export function FileRow({
  onMetadata,
  entry: row,
  index,
  top,
  height,
  selected,
  focused,
  hidden,
  onChoose,
  onFocus,
  onOpen,
  onTouchStart,
  onTouchEnd,
}: {
  onMetadata: (ref: string, value: EntryMetadata) => void;
  entry: Entry;
  index: number;
  top: number;
  height: number;
  selected: boolean;
  focused: boolean;
  hidden: Column[];
  onChoose: (index: number, toggle?: boolean, range?: boolean) => void;
  onFocus: (index: number) => void;
  onOpen: (entry: Entry) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}) {
  const split = row.kind === "file" ? row.name.lastIndexOf(".") : -1;
  const callback = useRef(onMetadata);
  callback.current = onMetadata;
  const [metadataError, setMetadataError] = useState(false);
  useEffect(() => {
    if (row.modified !== undefined && row.lastChange !== undefined) return;
    const controller = new AbortController();
    void library
      .metadata(row.ref, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) callback.current(row.ref, value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMetadataError(true);
      });
    return () => controller.abort();
  }, [row.ref, row.sha]);
  const touchOrigin = useRef({ x: 0, y: 0 });
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      title={metadataError ? t("metadataUnavailable") : undefined}
      tabIndex={focused ? 0 : -1}
      data-index={index}
      className={styles.row}
      style={{ top, height }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onOpen(row);
        }
      }}
      onFocus={() => onFocus(index)}
      onClick={(e) => {
        onChoose(index, e.ctrlKey || e.metaKey, e.shiftKey);
        e.currentTarget.focus();
      }}
      onDoubleClick={() => row.kind !== "special" && onOpen(row)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          touchOrigin.current = { x: e.clientX, y: e.clientY };
          onTouchStart();
        }
      }}
      onPointerMove={(e) => {
        if (
          e.pointerType === "touch" &&
          Math.abs(e.clientX - touchOrigin.current.x) +
            Math.abs(e.clientY - touchOrigin.current.y) >
            8
        )
          onTouchEnd();
      }}
      onContextMenu={(e) => {
        if (
          (e.nativeEvent as PointerEvent).pointerType === "touch" ||
          matchMedia("(pointer: coarse)").matches
        )
          e.preventDefault();
      }}
      onPointerCancel={onTouchEnd}
      onPointerUp={onTouchEnd}
    >
      <div role="gridcell">
        <input
          tabIndex={-1}
          type="checkbox"
          aria-label={row.name}
          checked={selected}
          onClick={(e) => {
            e.stopPropagation();
            onChoose(index, true, e.shiftKey);
          }}
          readOnly
        />
      </div>
      <div role="gridcell">
        <FileGlyph
          compact
          folder={row.kind === "dir"}
          extension={row.name.split(".").at(-1)?.toUpperCase().slice(0, 4)}
        />
        <button
          type="button"
          aria-label={row.name}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onChoose(index, e.ctrlKey || e.metaKey, e.shiftKey);
            onFocus(index);
          }}
          disabled={row.kind === "special"}
        >
          {split > 0 ? (
            <>
              <span className={styles.fileBase}>
                {row.name.slice(0, split)}
              </span>
              <span className={styles.fileExtension}>
                {row.name.slice(split)}
              </span>
            </>
          ) : (
            row.name
          )}
        </button>
      </div>
      <div
        role="gridcell"
        className={styles.sizeCell}
        data-size
        data-hidden={hidden.includes("size")}
      >
        {row.kind === "file"
          ? new Intl.NumberFormat(undefined, {
              maximumFractionDigits: 1,
            }).format(
              row.size < 1048576 ? row.size / 1024 : row.size / 1048576,
            ) + (row.size < 1048576 ? " KB" : " MB")
          : ""}
        {row.kind === "file" && (
          <span className={styles.weightRule} aria-hidden="true">
            <Meter label={row.name} value={row.size / 1048576} />
          </span>
        )}
      </div>
      {!hidden.includes("modified") && (
        <div role="gridcell" title={row.modified ?? undefined}>
          {row.modified ? relativeTime(row.modified) : t("unknown")}
        </div>
      )}
      {!hidden.includes("lastChange") && (
        <div role="gridcell" title={row.lastChange ?? undefined}>
          {row.lastChange ?? t("unknown")}
        </div>
      )}
    </div>
  );
}
