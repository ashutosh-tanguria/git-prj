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
import { dragReference, type LibraryItem } from "../services/organizer";
import { ProviderMark } from "../ui/ProviderMark";
import type { ReactNode } from "react";
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
  mixed,
  reference,
  references,
  tags,
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
  mixed?: boolean;
  reference?: LibraryItem;
  references?: LibraryItem[];
  tags?: (item: LibraryItem) => ReactNode;
}) {
  const split = row.kind === "file" ? row.name.lastIndexOf(".") : -1;
  const callback = useRef(onMetadata);
  callback.current = onMetadata;
  const [metadataError, setMetadataError] = useState(false);
  useEffect(() => {
    if (mixed || (row.modified !== undefined && row.lastChange !== undefined))
      return;
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
  }, [row.ref, row.sha, mixed]);
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
      draggable={!!references?.length}
      onDragStart={(event) => {
        if (!references?.length) return;
        event.dataTransfer.setData(dragReference, JSON.stringify(references));
        event.dataTransfer.effectAllowed = "link";
      }}
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
          row.kind !== "special" &&
          !matchMedia("(pointer: coarse)").matches
        ) {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          window.dispatchEvent(
            new CustomEvent("shelf-site-context", {
              detail: {
                entry: mixed ? undefined : row,
                sources: references?.length ? references : undefined,
                x: e.clientX || rect.left,
                y: e.clientY || rect.bottom,
              },
            }),
          );
          return;
        }
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
        {reference && tags?.(reference)}
      </div>
      {!hidden.includes("modified") && (
        <div role="gridcell" title={row.modified ?? undefined}>
          {row.modified ? relativeTime(row.modified) : t("unknown")}
        </div>
      )}
      {!hidden.includes("fileType") && (
        <div role="gridcell">
          {row.kind === "dir"
            ? t("folder")
            : row.name.split(".").at(-1)?.toUpperCase()}
        </div>
      )}
      <div
        role="gridcell"
        className={styles.sizeCell}
        data-size
        data-hidden={hidden.includes("size")}
      >
        <span className={styles.sizeValue}>
          {row.size >= 25 * 1048576 && row.size < 50 * 1048576 && (
            <span>{t("large")} </span>
          )}
          {row.kind === "file"
            ? new Intl.NumberFormat(undefined, {
                maximumFractionDigits: 1,
              }).format(
                row.size < 1048576 ? row.size / 1024 : row.size / 1048576,
              ) + (row.size < 1048576 ? " KB" : " MB")
            : ""}
        </span>
        {row.kind === "file" && (
          <span className={styles.weightRule} aria-hidden="true">
            <Meter label={row.name} value={row.size / 1048576} />
          </span>
        )}
      </div>
      {!hidden.includes("lastChange") && (
        <div role="gridcell" title={row.lastChange ?? undefined}>
          <span className={styles.cellText}>
            {row.lastChange ?? t("unknown")}
          </span>
        </div>
      )}
      {mixed && reference && (
        <div role="gridcell" data-provider-cell>
          <ProviderMark
            provider={reference.endpoint.provider}
            label={t(reference.endpoint.provider)}
          />
        </div>
      )}
    </div>
  );
}
