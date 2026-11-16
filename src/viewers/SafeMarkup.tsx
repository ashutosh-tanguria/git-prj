import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("ts", typescript);
import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
export function sanitizedMarkdown(text: string) {
  return DOMPurify.sanitize(marked.parse(text, { async: false }), {
    FORBID_TAGS: ["img", "iframe", "form", "style", "script", "svg", "math"],
    FORBID_ATTR: ["style"],
  });
}
export default function SafeMarkup({ text }: { text: string }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fragment = DOMPurify.sanitize(sanitizedMarkdown(text), {
      RETURN_DOM_FRAGMENT: true,
    });
    fragment.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) a.removeAttribute("href");
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
    node.current?.replaceChildren(fragment);
  }, [text]);
  return <div ref={node} />;
}

export function SafeCode({
  text,
  language,
}: {
  text: string;
  language: string;
}) {
  const node = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const html = hljs.getLanguage(language)
      ? hljs.highlight(text, { language }).value
      : DOMPurify.sanitize(
          text.replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
        );
    node.current?.replaceChildren(
      DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true }),
    );
  }, [text, language]);
  return <pre ref={node} />;
}
