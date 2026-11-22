import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import {
  itemKey,
  dragReference,
  type LibraryItem,
} from "../services/organizer";
import { selectionClick } from "../services/selection";
import { loadThumbnail, thumbnailWidths } from "../services/thumbnails";
import type { ResolveProvider } from "../services/transferTypes";
import { FileGlyph } from "../ui/FileGlyph";
import { ProviderMark } from "../ui/ProviderMark";
import { t } from "../i18n";
import { Sash } from "./Sash";
import { readReference } from "../services/referenceRead";
import styles from "./ExplorerViews.module.css";

export interface ViewData {
  rows: LibraryItem[];
  location: string;
  title?: string;
  list(folder: LibraryItem, signal: AbortSignal): Promise<LibraryItem[]>;
  resolve: ResolveProvider;
  onSelect(items: LibraryItem[]): void;
  onOpen(item: LibraryItem): void;
  onPreview(item: LibraryItem): void;
  mixed?: boolean;
}
export default function ExplorerViews({
  view,
  data,
}: {
  view: "viewGrid" | "viewColumns";
  data: ViewData;
}) {
  const [size, setSize] = useState<number>(160);
  if (view === "viewColumns")
    return <Columns key={data.location} data={data} />;
  return (
    <section className={styles.gridView}>
      <label>
        {t("thumbnailSize")}{" "}
        <select
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        >
          {thumbnailWidths.map((width) => (
            <option key={width} value={width}>
              {width} px
            </option>
          ))}
        </select>
      </label>
      <VirtualItems
        key={data.location}
        items={data.rows}
        width={size}
        resolve={data.resolve}
        onSelect={data.onSelect}
        onOpen={data.onOpen}
        onPreview={data.onPreview}
        mixed={data.mixed}
      />
    </section>
  );
}

function Thumbnail({
  item,
  size,
  resolve,
}: {
  item: LibraryItem;
  size: number;
  resolve: ResolveProvider;
}) {
  const [url, setUrl] = useState("");
  const lookup = useRef(resolve);
  lookup.current = resolve;
  const key = itemKey(item);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    void loadThumbnail(item, size, lookup.current, controller.signal).then(
      (blob) => {
        if (blob && !controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      },
    );
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, item.entry.version, item.entry.size, size]);
  return url ? (
    <img src={url} alt="" />
  ) : (
    <FileGlyph
      folder={item.entry.kind === "dir"}
      extension={item.entry.name.split(".").at(-1)?.toUpperCase().slice(0, 4)}
      compact={size < 100}
    />
  );
}
function formatSize(size: number) {
  return new Intl.NumberFormat(document.documentElement.lang, {
    notation: "compact",
    style: "unit",
    unit: "byte",
  }).format(size);
}

interface ItemsProps {
  items: LibraryItem[];
  label?: string;
  expanded?: string;
  width?: number;
  mixed?: boolean;
  resolve: ResolveProvider;
  onSelect(items: LibraryItem[]): void;
  onOpen(item: LibraryItem): void;
  onPreview(item: LibraryItem): void;
  onDrill?(item: LibraryItem, fromKeyboard?: boolean): void;
  onBack?(): void;
  active?: boolean;
}
function VirtualItems({
  items,
  label,
  expanded,
  width,
  mixed,
  resolve,
  onSelect,
  onOpen,
  onPreview,
  onDrill,
  onBack,
  active = true,
}: ItemsProps) {
  const rows = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Number(b.entry.kind === "dir") - Number(a.entry.kind === "dir") ||
          a.entry.name.localeCompare(b.entry.name),
      ),
    [items],
  );
  const host = useRef<HTMLDivElement>(null);
  const anchor = useRef(0);
  const buffer = useRef({ text: "", time: 0 });
  const [lanes, setLanes] = useState(1);
  const [focused, setFocused] = useState(0);
  const [selected, setSelected] = useState(new Set<string>());
  const [touch, setTouch] = useState(false);
  const selectedItems = useMemo(
    () => rows.filter((item) => selected.has(itemKey(item))),
    [rows, selected],
  );
  useEffect(() => {
    if (!active) setSelected((old) => (old.size ? new Set() : old));
  }, [active]);
  useEffect(() => {
    const node = host.current;
    if (!node || !width) return;
    const measure = () =>
      setLanes(Math.max(1, Math.floor(node.clientWidth / (width + 16))));
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [width]);
  const groups = Math.ceil(rows.length / (width ? lanes : 1));
  const columns = width ? lanes : 1;
  const virtual = useVirtualizer({
    count: groups,
    getScrollElement: () => host.current,
    estimateSize: () => (width ? width + 64 : 44),
    overscan: 3,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          Math.floor(focused / columns),
        ]),
      ]
        .filter((index) => index < groups)
        .sort((a, b) => a - b),
  });
  useEffect(() => {
    virtual.measure();
  }, [width, columns, virtual]);
  const move = (index: number) => {
    const next = Math.min(rows.length - 1, Math.max(index, 0));
    if (next < 0) return;
    setFocused(next);
    virtual.scrollToIndex(Math.floor(next / columns));
  };
  function choose(
    index: number,
    toggle = false,
    range = false,
    fromKeyboard = false,
  ) {
    const item = rows[index];
    if (!item) return;
    const next = selectionClick(
      rows.flatMap((row, position) =>
        selected.has(itemKey(row)) ? [position] : [],
      ),
      index,
      anchor.current,
      rows.length,
      toggle || touch,
      range,
    );
    setSelected(new Set(next.map((position) => itemKey(rows[position]))));
    onSelect(next.map((position) => rows[position]));
    setFocused(index);
    if (!range) anchor.current = index;
    if (!toggle && !range && !touch) onDrill?.(item, fromKeyboard);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const item = rows[focused];
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key;
    if (event.altKey) return;
    if (modifier && key.toLowerCase() === "a") {
      event.preventDefault();
      setSelected(new Set(rows.map(itemKey)));
      onSelect(rows);
    } else if (!width && key === "ArrowLeft") {
      event.preventDefault();
      onBack?.();
    } else if (!width && key === "ArrowRight") {
      event.preventDefault();
      if (item) choose(focused, false, false, true);
    } else if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(key)
    ) {
      event.preventDefault();
      const steps: Record<string, number> = {
        ArrowUp: -columns,
        ArrowDown: columns,
        ArrowLeft: -1,
        ArrowRight: 1,
      };
      const next =
        key === "Home"
          ? 0
          : key === "End"
            ? rows.length - 1
            : Math.min(rows.length - 1, Math.max(0, focused + steps[key]));
      if (event.shiftKey) choose(next, false, true);
      move(next);
    } else if (key === "Enter" && item) {
      event.preventDefault();
      if (onDrill && item.entry.kind === "dir") onDrill(item, true);
      else onOpen(item);
    } else if (key === " " && item) {
      event.preventDefault();
      if (event.shiftKey || modifier || touch)
        choose(focused, modifier, event.shiftKey);
      else if (onDrill) choose(focused, false, false, true);
      else onPreview(item);
    } else if (!modifier && key.length === 1) {
      const now = Date.now();
      buffer.current = {
        text:
          (now - buffer.current.time < 800 ? buffer.current.text : "") +
          key.toLowerCase(),
        time: now,
      };
      const next = rows.findIndex((row) =>
        row.entry.name.toLowerCase().startsWith(buffer.current.text),
      );
      if (next >= 0) {
        event.preventDefault();
        move(next);
      }
    }
  }
  const id = useId();
  const optionId = (index: number) => id + "-option-" + index;
  return (
    <>
      {width && (
        <button
          type="button"
          aria-pressed={touch}
          onClick={() => setTouch(!touch)}
        >
          {t("selectionMode")}
        </button>
      )}
      <div
        ref={host}
        tabIndex={0}
        role={width ? "listbox" : "tree"}
        aria-label={label ?? t("files")}
        aria-activedescendant={rows[focused] ? optionId(focused) : undefined}
        aria-multiselectable="true"
        data-file-command-scope
        className={styles.items}
        data-card={!!width}
        onKeyDown={keyboard}
      >
        <div
          role="presentation"
          className={styles.spacer}
          style={{ height: virtual.getTotalSize() }}
        >
          {virtual.getVirtualItems().map((group) => (
            <div
              role="presentation"
              className={styles.group}
              key={group.index}
              style={{
                top: group.start,
                height: group.size,
                gridTemplateColumns: width
                  ? "repeat(" + columns + ", minmax(0, 1fr))"
                  : undefined,
              }}
            >
              {rows
                .slice(group.index * columns, (group.index + 1) * columns)
                .map((item, offset) => {
                  const index = group.index * columns + offset;
                  const { entry } = item;
                  const key = itemKey(item);
                  const picked = selected.has(key);
                  const getSources = () => (picked ? selectedItems : [item]);
                  const context = (x: number, y: number) =>
                    window.dispatchEvent(
                      new CustomEvent("shelf-site-context", {
                        detail: { sources: getSources(), x, y },
                      }),
                    );
                  return (
                    // The composite owns keyboard input via aria-activedescendant.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <div
                      key={key}
                      id={optionId(index)}
                      role={width ? "option" : "treeitem"}
                      aria-selected={picked}
                      aria-posinset={index + 1}
                      aria-setsize={rows.length}
                      aria-expanded={
                        !width && entry.kind === "dir"
                          ? expanded === key
                          : undefined
                      }
                      data-active={focused === index || undefined}
                      className={styles.item}
                      draggable={entry.kind !== "special"}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          dragReference,
                          JSON.stringify(getSources()),
                        );
                        event.dataTransfer.effectAllowed = "link";
                      }}
                      onContextMenu={(event) => {
                        if (entry.kind === "special") return;
                        event.preventDefault();
                        context(event.clientX, event.clientY);
                      }}
                      onClick={(event) => {
                        host.current?.focus({ preventScroll: true });
                        choose(
                          index,
                          event.ctrlKey || event.metaKey,
                          event.shiftKey,
                        );
                      }}
                      onDoubleClick={() =>
                        entry.kind !== "special" &&
                        (onDrill && entry.kind === "dir"
                          ? onDrill(item)
                          : onOpen(item))
                      }
                    >
                      <span
                        className={styles.art}
                        style={
                          width ? { height: width, maxWidth: width } : undefined
                        }
                      >
                        {width ? (
                          <Thumbnail
                            item={item}
                            size={width}
                            resolve={resolve}
                          />
                        ) : (
                          <FileGlyph
                            compact
                            folder={entry.kind === "dir"}
                            extension={entry.name
                              .split(".")
                              .at(-1)
                              ?.toUpperCase()
                              .slice(0, 4)}
                          />
                        )}
                      </span>
                      <span className={styles.name} title={entry.name}>
                        {entry.name}
                      </span>
                      {width && entry.size != null && entry.kind === "file" && (
                        <small>{formatSize(entry.size)}</small>
                      )}
                      {mixed && (
                        <ProviderMark
                          provider={item.endpoint.provider}
                          label={t(item.endpoint.provider)}
                        />
                      )}
                      {!width && entry.kind === "dir" && (
                        <span aria-hidden="true">›</span>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      {!rows.length && <p role="status">{t("emptyFolder")}</p>}
    </>
  );
}

type ColumnPath = {
  folder: LibraryItem;
  rows: LibraryItem[];
  loading: boolean;
  error?: boolean;
};
function Columns({ data }: { data: ViewData }) {
  const [path, setPath] = useState<ColumnPath[]>([]);
  const [pixelWidths, setWidths] = useState<number[]>([]);
  const [preview, setPreview] = useState<LibraryItem>();
  const [activeDepth, setActiveDepth] = useState(0);
  const request = useRef<AbortController | null>(null);
  const openColumns = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<number | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const levels = [
    {
      rows: data.rows,
      title: data.title ?? t("files"),
      loading: false,
      error: false,
    },
    ...path.map((column) => ({
      rows: column.rows,
      title: column.folder.entry.name,
      loading: column.loading,
      error: column.error,
    })),
  ];
  useEffect(() => {
    if (focusAfter.current == null) return;
    const node = openColumns.current?.querySelector<HTMLElement>(
      '[data-level="' + focusAfter.current + '"] [role="tree"]',
    );
    if (node) {
      node.focus();
      focusAfter.current = null;
    }
  }, [path]);
  function drill(item: LibraryItem, depth: number, keyboard = false) {
    if (!keyboard) focusAfter.current = null;
    if (item.entry.kind !== "dir") {
      request.current?.abort();
      setPath((old) => old.slice(0, depth));
      setPreview(item);
      return;
    }
    setPreview(undefined);
    if (
      path[depth] &&
      itemKey(path[depth].folder) === itemKey(item) &&
      !path[depth].error
    ) {
      if (keyboard)
        openColumns.current
          ?.querySelector<HTMLElement>(
            '[data-level="' + (depth + 1) + '"] [role="tree"]',
          )
          ?.focus();
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (keyboard) focusAfter.current = depth + 1;
    setPath((old) => [
      ...old.slice(0, depth),
      { folder: item, rows: [], loading: true },
    ]);
    void data.list(item, controller.signal).then(
      (rows) => {
        if (!controller.signal.aborted)
          setPath((old) => [
            ...old.slice(0, depth),
            { folder: item, rows, loading: false },
          ]);
      },
      () => {
        if (!controller.signal.aborted)
          setPath((old) => [
            ...old.slice(0, depth),
            { folder: item, rows: [], loading: false, error: true },
          ]);
      },
    );
  }
  return (
    <div ref={openColumns} className={styles.columns}>
      {levels.map(({ rows, title, loading, error }, depth) => {
        const width = pixelWidths[depth] ?? 240;
        const key = depth ? itemKey(path[depth - 1].folder) : data.location;
        return (
          <div key={key} className={styles.level} data-level={depth}>
            <section style={{ width }}>
              <h3>
                {title}{" "}
                <small>{t("columnItemCount", { count: rows.length })}</small>
              </h3>
              {loading && <p role="status">{t("loadingRead")}</p>}
              {error && <p role="alert">{t("readError")}</p>}
              <VirtualItems
                items={rows}
                label={title + " " + (depth + 1)}
                expanded={path[depth] && itemKey(path[depth].folder)}
                resolve={data.resolve}
                active={activeDepth === depth}
                onSelect={(items) => {
                  setActiveDepth(depth);
                  data.onSelect(items);
                }}
                onOpen={data.onOpen}
                onPreview={data.onPreview}
                onDrill={(item, keyboard) => drill(item, depth, keyboard)}
                onBack={() => {
                  if (!depth) return;
                  openColumns.current
                    ?.querySelector<HTMLElement>(
                      '[data-level="' + (depth - 1) + '"] [role="tree"]',
                    )
                    ?.focus();
                }}
                mixed={data.mixed && depth === 0}
              />
            </section>
            <Sash
              label={t("columnWidth") + " " + title}
              value={width}
              min={144}
              max={480}
              initial={240}
              onChange={(size) =>
                setWidths((old) => Object.assign([...old], { [depth]: size }))
              }
              onCollapse={() => {}}
            />
          </div>
        );
      })}
      <section className={styles.preview} aria-label={t("columnPreview")}>
        <h3>{t("columnPreview")}</h3>
        {preview ? (
          <>
            <ColumnPreview
              key={itemKey(preview)}
              item={preview}
              resolve={data.resolve}
            />
            <p>{preview.entry.name}</p>
            <button type="button" onClick={() => data.onPreview(preview)}>
              {t("quickLook")}
            </button>
          </>
        ) : (
          <p>{t("viewChooseFile")}</p>
        )}
      </section>
    </div>
  );
}
function ColumnPreview({
  item,
  resolve,
}: {
  item: LibraryItem;
  resolve: ResolveProvider;
}) {
  const [text, setText] = useState<string>();
  useEffect(() => {
    if (
      !/\.(?:txt|md|csv|json|log|ini|xml|yaml|yml|ts|js|css|html)$/i.test(
        item.entry.name,
      ) ||
      item.entry.size == null ||
      item.entry.size > 1024 * 1024
    )
      return;
    const task = new AbortController();
    void readReference(item, resolve, task.signal)
      .then((blob) => blob.slice(0, 4096).text())
      .then(
        (text) => {
          if (!task.signal.aborted) setText(text);
        },
        () => {},
      );
    return () => task.abort();
  }, [item]);
  return text === undefined ? (
    <div className={styles.previewArt}>
      <Thumbnail item={item} size={200} resolve={resolve} />
    </div>
  ) : (
    <pre>{text}</pre>
  );
}
