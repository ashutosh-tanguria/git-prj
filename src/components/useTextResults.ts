import { useEffect, useState } from "react";
import { textIndexJob } from "../services/textIndexClient";
import type { TextMatch } from "../services/textSearch";

export function useTextResults(scopes: string[], query: string) {
  const [matches, setMatches] = useState<TextMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(scopes);
  useEffect(() => {
    setMatches([]);
    setLoading(false);
    if (!query.trim() || !scopes.length) return;
    let controller: AbortController;
    let timer: ReturnType<typeof setTimeout>;
    const start = () => {
      clearTimeout(timer);
      controller?.abort();
      const pending = new AbortController();
      controller = pending;
      setLoading(true);
      timer = setTimeout(() => {
        void textIndexJob({ type: "search", scopes, query }, pending.signal)
          .then((result) => {
            if (!pending.signal.aborted && result.type === "hits")
              setMatches(result.results);
          })
          .catch(() => {})
          .finally(() => {
            if (!pending.signal.aborted) setLoading(false);
          });
      }, 120);
    };
    start();
    window.addEventListener("shelf-text-index-changed", start);
    return () => {
      clearTimeout(timer);
      controller.abort();
      window.removeEventListener("shelf-text-index-changed", start);
    };
  }, [key, query]);
  return { matches, loading };
}
