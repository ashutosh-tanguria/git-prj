import {
  useRef,
  useState,
  useEffect,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import type { Entry } from "../services/library";
import { selectionClick, selectRange } from "../services/selection";
import { preference, savePreference } from "../services/preferences";
import { columns, type Column } from "./TableHeader";

interface Layout {
  widths: number[];
  sort: Column;
  reverse: boolean;
  hidden: Column[];
}
const initial: Layout = {
  widths: [380, 120, 160, 240],
  sort: "name",
  reverse: false,
  hidden: [],
};
export function useFileTable({
  entries,
  onOpen,
  onPreview,
  onSelectionChange,
  locationKey = "default",
}: {
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onPreview: (entry: Entry, rows?: Entry[]) => void;
  onSelectionChange?: (entries: Entry[]) => void;
  locationKey?: string;
}) {
  const suppressClick = useRef(false);
  const focusFrame = useRef(0);
  const parent = useRef<HTMLDivElement>(null),
    anchor = useRef(0),
    buffer = useRef({ value: "", time: 0 }),
    drag = useRef<{
      x: number;
      y: number;
      index: number;
      toggle?: boolean;
      range?: boolean;
      moved?: boolean;
    } | null>(null);
  const [metadata, setMetadata] = useState<
    Record<string, { modified: string | null; lastChange: string | null }>
  >({});
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>();
  const [focused, setFocused] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [layout, setLayout] = useState(initial),
    [ready, setReady] = useState(false),
    [rowHeight, setRowHeight] = useState(32),
    [mode, setMode] = useState(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    let active = true;
    setReady(false);
    setSelected([]);
    setFocused(0);
    buffer.current = { value: "", time: 0 };
    anchor.current = 0;
    void preference("table:" + locationKey, initial).then((value) => {
      if (active) {
        setLayout(value);
        setReady(true);
      }
    });
    return () => {
      active = false;
      clearTimeout(touchTimer.current);
    };
  }, [locationKey]);
  useEffect(() => {
    if (ready) void savePreference("table:" + locationKey, layout);
  }, [layout, locationKey, ready]);
  useEffect(() => {
    const measure = () => {
      if (parent.current)
        setRowHeight(
          innerWidth < 640
            ? 64
            : parseFloat(
                getComputedStyle(parent.current).getPropertyValue(
                  "--row-height",
                ),
              ) || 32,
        );
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-density"],
    });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const rows = entries
    .map((entry) => ({ ...entry, ...metadata[entry.ref] }))
    .sort(
      (a, b) =>
        Number(b.kind === "dir") -
        Number(a.kind === "dir") +
        (a.kind === b.kind
          ? (layout.reverse ? -1 : 1) *
            (layout.sort === "size"
              ? a.size - b.size
              : String(a[layout.sort] ?? "").localeCompare(
                  String(b[layout.sort] ?? ""),
                ))
          : 0),
    );
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => rowHeight,
    overscan: 6,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...(focused < rows.length ? [focused] : []),
        ]),
      ].sort((a, b) => a - b),
  });
  useEffect(() => {
    virtual.measure();
  }, [rowHeight, virtual]);
  const selectedEntries = rows.filter((row) => selected.includes(row.ref));
  const notify = useRef(onSelectionChange);
  notify.current = onSelectionChange;
  useEffect(() => {
    notify.current?.(
      entries
        .filter((entry) => selected.includes(entry.ref))
        .map((entry) => ({ ...entry, ...metadata[entry.ref] })),
    );
  }, [selected, entries, metadata]);
  function choose(index: number, toggle = false, range = false) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const indices = selectionClick(
      rows.flatMap((row, i) => (selected.includes(row.ref) ? [i] : [])),
      index,
      anchor.current,
      rows.length,
      toggle || mode,
      range,
    );
    setSelected(indices.map((i) => rows[i].ref));
    if (!range) anchor.current = index;
    setFocused(index);
  }
  function focus(index: number) {
    const next = Math.max(0, Math.min(rows.length - 1, index));
    setFocused(next);
    virtual.scrollToIndex(next);
    cancelAnimationFrame(focusFrame.current);
    const target = parent.current?.querySelector<HTMLElement>(
      '[data-index="' + next + '"]',
    );
    if (target) target.focus();
    else
      focusFrame.current = requestAnimationFrame(() => {
        if (!document.querySelector('[role="dialog"]'))
          parent.current
            ?.querySelector<HTMLElement>('[data-index="' + next + '"]')
            ?.focus();
      });
  }
  const template =
    "32px " +
    columns
      .flatMap((c, i) =>
        layout.hidden.includes(c) ? [] : [layout.widths[i] + "px"],
      )
      .join(" ");
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[role="separator"],summary,input'))
      return;
    const index = focused;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSelected(rows.map((row) => row.ref));
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? rows.length - 1
            : Math.max(
                0,
                Math.min(
                  rows.length - 1,
                  index + (e.key === "ArrowDown" ? 1 : -1),
                ),
              );
      if (e.shiftKey) choose(next, false, true);
      focus(next);
    } else if (e.key === "Enter" && rows[index]) {
      e.preventDefault();
      onOpen(rows[index]);
    } else if (e.key === " " && rows[index]) {
      e.preventDefault();
      if (e.shiftKey) choose(index, false, true);
      else if (mode || e.ctrlKey || e.metaKey) choose(index, true);
      else onPreview(rows[index], rows);
    } else if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const now = Date.now();
      buffer.current = {
        value:
          (now - buffer.current.time > 800 ? "" : buffer.current.value) +
          e.key.toLowerCase(),
        time: now,
      };
      const next = rows.findIndex((row) =>
        row.name.toLowerCase().startsWith(buffer.current.value),
      );
      if (next >= 0) {
        choose(next);
        focus(next);
      }
    }
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (
      (e.target === e.currentTarget ||
        (e.target as HTMLElement).getAttribute("role") === "gridcell") &&
      e.pointerType === "mouse"
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      drag.current = {
        toggle: e.ctrlKey || e.metaKey,
        range: e.shiftKey,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top + e.currentTarget.scrollTop,
        index: Math.floor(
          (e.clientY -
            rect.top +
            e.currentTarget.scrollTop -
            (parent.current?.querySelector<HTMLElement>("[data-rows]")
              ?.offsetTop || 0)) /
            rowHeight,
        ),
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      const rect = e.currentTarget.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top + e.currentTarget.scrollTop;
      if (Math.abs(x - drag.current.x) + Math.abs(y - drag.current.y) < 4)
        return;
      drag.current.moved = true;
      setBox({
        x: Math.min(x, drag.current.x),
        y: Math.min(y, drag.current.y),
        w: Math.abs(x - drag.current.x),
        h: Math.abs(y - drag.current.y),
      });
      setSelected(
        selectRange(
          rows.length,
          drag.current.index,
          Math.floor(
            (y -
              (parent.current?.querySelector<HTMLElement>("[data-rows]")
                ?.offsetTop || 0)) /
              rowHeight,
          ),
        )
          .map((i) => rows[i]?.ref)
          .filter(Boolean),
      );
    }
  };
  const onPointerUp = () => {
    if (
      drag.current &&
      !drag.current.moved &&
      drag.current.index >= 0 &&
      drag.current.index < rows.length
    )
      choose(drag.current.index, drag.current.toggle, drag.current.range);
    drag.current = null;
    setBox(undefined);
    clearTimeout(touchTimer.current);
  };
  return {
    metadata,
    setMetadata,
    suppressClick,
    parent,
    box,
    focused,
    setFocused,
    selected,
    layout,
    setLayout,
    mode,
    setMode,
    rows,
    virtual,
    selectedEntries,
    choose,
    focus,
    template,
    touchTimer,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
