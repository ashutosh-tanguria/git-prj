import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { preference, savePreference } from "../services/preferences";
import { t } from "../i18n";

GlobalWorkerOptions.workerSrc = worker;
interface Position {
  page: number;
  zoom: number;
  mode: string;
}
export function usePdf({ blob, fileKey }: { blob: Blob; fileKey: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [position, setPosition] = useState<Position>({
    page: 1,
    zoom: 1.2,
    mode: "single",
  });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [sidebar, setSidebar] = useState("none"),
    [outline, setOutline] = useState<
      Awaited<ReturnType<PDFDocumentProxy["getOutline"]>>
    >([]),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState<number[]>([]),
    [searching, setSearching] = useState(false),
    [match, setMatch] = useState(0),
    [inverted, setInverted] = useState(false),
    [width, setWidth] = useState(800);
  const host = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null),
    jump = useRef(false),
    digits = useRef(""),
    searchSequence = useRef(0),
    positionRef = useRef(position);
  positionRef.current = position;
  useEffect(() => {
    function highlight() {
      const target = matches[match];
      if (!target) return;
      const marks = host.current?.querySelectorAll<HTMLElement>(
        '[data-pdf-page="' + target + '"] mark',
      );
      const index = matches
        .slice(0, match)
        .filter((page) => page === target).length;
      marks?.forEach((mark) => {
        mark.dataset.current = String(Number(mark.dataset.match) === index);
      });
      const current = Array.from(marks || []).find(
          (mark) => Number(mark.dataset.match) === index,
        ),
        scroll = host.current;
      if (current && scroll) {
        const rect = current.getBoundingClientRect(),
          viewport = scroll.getBoundingClientRect();
        if (rect.top < viewport.top || rect.bottom > viewport.bottom)
          scroll.scrollTop += rect.top - viewport.top - 32;
      }
    }
    const observer = new MutationObserver(highlight);
    if (host.current)
      observer.observe(host.current, { childList: true, subtree: true });
    highlight();
    return () => observer.disconnect();
  }, [matches, match, position.page]);
  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    setReady(false);
    setError("");
    setDoc(undefined);
    void (async () => {
      const remembered = await preference<Position>("pdf:" + fileKey, {
        page: 1,
        zoom: 1.2,
        mode: "single",
      });
      const task = getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
        disableFontFace: true,
        useWasm: false,
      });
      destroy = () => {
        void task.destroy();
      };
      const pdf = await task.promise;
      if (cancelled) {
        destroy();
        return;
      }
      setDoc(pdf);
      setPosition({
        ...remembered,
        page: Math.min(pdf.numPages, Math.max(1, remembered.page)),
        zoom: Math.max(0.25, Math.min(4, remembered.zoom)),
      });
      setOutline((await pdf.getOutline()) || []);
      setReady(true);
    })().catch(() => {
      if (!cancelled) setError(t("pdfError"));
    });
    return () => {
      cancelled = true;
      searchSequence.current++;
      destroy();
    };
  }, [blob, fileKey]);
  useEffect(() => {
    if (ready) void savePreference("pdf:" + fileKey, position);
  }, [position, fileKey, ready]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (host.current) setWidth(host.current.clientWidth);
    });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (ready && positionRef.current.mode === "continuous")
      requestAnimationFrame(() => {
        const scroll = host.current,
          target = scroll?.querySelector<HTMLElement>(
            '[data-pdf-page="' + positionRef.current.page + '"]',
          );
        if (scroll && target) scroll.scrollTop = target.offsetTop;
      });
  }, [ready]);
  function go(page: number) {
    if (!doc) return;
    const next = Math.max(1, Math.min(doc.numPages, page));
    setPosition((value) => ({ ...value, page: next }));
    if (position.mode === "continuous")
      requestAnimationFrame(() => {
        const scroll = host.current,
          target = scroll?.querySelector<HTMLElement>(
            '[data-pdf-page="' + next + '"]',
          );
        if (scroll && target) scroll.scrollTop = target.offsetTop;
      });
  }
  function zoom(value: number) {
    setPosition((p) => ({ ...p, zoom: Math.max(0.25, Math.min(4, value)) }));
  }
  async function fit(mode: "width" | "page") {
    if (!doc) return;
    const pdfPage = await doc.getPage(position.page),
      viewport = pdfPage.getViewport({ scale: 1 });
    zoom(
      mode === "width"
        ? (width - 32) / viewport.width
        : Math.min(
            (width - 32) / viewport.width,
            (host.current?.clientHeight || innerHeight - 300) / viewport.height,
          ),
    );
  }
  async function find() {
    if (!doc) return;
    const sequence = ++searchSequence.current;
    setSearching(true);
    const found: number[] = [];
    try {
      const needle = query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (needle)
        for (let page = 1; page <= doc.numPages; page++) {
          const content = await (await doc.getPage(page)).getTextContent();
          if (sequence !== searchSequence.current) return;
          const text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ");
          let offset = text.toLocaleLowerCase().indexOf(needle);
          while (offset >= 0) {
            found.push(page);
            offset = text
              .toLocaleLowerCase()
              .indexOf(needle, offset + needle.length);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      if (sequence === searchSequence.current) {
        setMatches(found);
        setMatch(0);
        if (found[0]) go(found[0]);
      }
    } catch {
      if (sequence === searchSequence.current) setError(t("readError"));
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  }
  return {
    positionRef,
    doc,
    position,
    setPosition,
    ready,
    error,
    sidebar,
    setSidebar,
    outline,
    query,
    setQuery,
    matches,
    searching,
    match,
    setMatch,
    inverted,
    setInverted,
    host,
    search,
    jump,
    digits,
    go,
    zoom,
    fit,
    find,
  };
}
