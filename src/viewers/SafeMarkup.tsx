import { highlightMatches } from "./highlight";
import { library } from "../services/library";
import { resolveRelative } from "../services/contentPaths";
import { viewerRoute, explorerRoute } from "../lib/refs";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Viewer.module.css";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("ts", typescript);
import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
export function sanitizedMarkdown(text: string) {
  const renderer = new marked.Renderer();
  renderer.image = ({ href, text }) =>
    '<span data-shelf-image="' +
    encodeURIComponent(href) +
    '" data-alt="' +
    encodeURIComponent(text) +
    '"></span>';
  return DOMPurify.sanitize(marked.parse(text, { async: false, renderer }), {
    FORBID_TAGS: ["img", "iframe", "form", "style", "script", "svg", "math"],
    FORBID_ATTR: ["style"],
  });
}
export default function SafeMarkup({
  text,
  fileRef,
  query,
}: {
  text: string;
  fileRef?: string;
  query?: string;
}) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    const fragment = DOMPurify.sanitize(sanitizedMarkdown(text), {
      RETURN_DOM_FRAGMENT: true,
    });
    fragment.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) {
        try {
          if (!fileRef) throw new Error();
          const ref = resolveRelative(fileRef, href);
          a.href = href.split(/[?#]/)[0].endsWith("/")
            ? explorerRoute(ref)
            : viewerRoute(ref);
          a.target = "_self";
          a.rel = "";
          return;
        } catch {
          a.removeAttribute("href");
        }
      }
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
    const images = Array.from(
      fragment.querySelectorAll<HTMLElement>("[data-shelf-image]"),
    );
    for (const [i, placeholder] of images.entries()) {
      const alt = decodeURIComponent(placeholder.dataset.alt || "");
      const source = decodeURIComponent(placeholder.dataset.shelfImage || "");
      if (!fileRef || i >= 10) {
        placeholder.replaceWith(document.createTextNode(alt));
        continue;
      }
      void (async () => {
        const ref = resolveRelative(fileRef, source);
        const ext = ref.path.split(".").at(-1)?.toLowerCase();
        const mime = ext === "svg" ? "image/svg+xml" : undefined;
        if (
          !["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(
            ext || "",
          )
        )
          throw new Error();
        const blob = await library.read(ref, controller.signal);
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(
          mime ? blob.slice(0, blob.size, mime) : blob,
        );
        urls.push(url);
        const image = document.createElement("img");
        image.alt = alt;
        image.src = url;
        image.style.maxWidth = "100%";
        placeholder.replaceWith(image);
      })().catch(() => {
        if (!controller.signal.aborted)
          placeholder.replaceWith(document.createTextNode(alt));
      });
    }
    node.current?.replaceChildren(fragment);
    if (node.current && query) highlightMatches(node.current, query);
    return () => {
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [text, fileRef, query]);
  return <div ref={node} className={styles.documentText} />;
}

export function SafeCode({
  text,
  language,
  plain = false,
  query,
}: {
  text: string;
  language: string;
  plain?: boolean;
  query?: string;
}) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fragment = document.createDocumentFragment();
    for (const [index, line] of text.split("\n").entries()) {
      const row = document.createElement("div");
      row.className = styles.codeRow;
      const gutter = document.createElement("span");
      gutter.className = styles.lineNumbers;
      gutter.setAttribute("aria-hidden", "true");
      gutter.textContent = String(index + 1);
      const code = document.createElement("code");
      code.className = styles.codeText;
      const html =
        !plain && hljs.getLanguage(language)
          ? hljs.highlight(line || " ", { language }).value
          : line.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
      code.replaceChildren(
        DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true }),
      );
      if (query) highlightMatches(code, query);
      row.append(gutter, code);
      fragment.append(row);
    }
    node.current?.replaceChildren(fragment);
  }, [text, language, plain, query]);
  const [wrap, setWrap] = useState(false);
  return (
    <section className={styles.codeViewer}>
      <div className={styles.imageControls}>
        <Button onPress={() => setWrap(!wrap)} selected={wrap}>
          {t("wrap")}
        </Button>
        <Button
          onPress={() => {
            void navigator.clipboard.writeText(text);
          }}
        >
          {t("copyText")}
        </Button>
      </div>
      {plain && <p>{t("plainLargeText")}</p>}
      <div ref={node} className={styles.codeLayout} data-wrap={wrap} />
    </section>
  );
}
