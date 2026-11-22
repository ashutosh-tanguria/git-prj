import { useEffect, useState } from "react";
import { cacheData } from "../services/cacheData";
import {
  cachedFiles,
  fileCacheKey,
  getCachedFile,
} from "../services/fileCache";
import { textIndexJob } from "../services/textIndexClient";
import {
  INDEX_FILE_LIMIT,
  indexable,
  type IndexMeta,
} from "../services/textIndexTypes";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import "../i18n/search";

export function IndexingIndicator({
  progress,
  paused,
  onToggle,
}: {
  progress?: { done: number; total: number };
  paused?: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <span role="status">
        {progress
          ? t("indexingFiles", { count: progress.done, total: progress.total })
          : t("indexPaused")}
      </span>
      <Button variant="quiet" onPress={onToggle}>
        {t(paused ? "indexResume" : "indexCancel")}
      </Button>
    </div>
  );
}

export function IndexingStatus({ scopes }: { scopes: string[] }) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [issues, setIssues] = useState<IndexMeta[]>([]);
  const scopeKey = JSON.stringify(scopes);
  useEffect(() => {
    if (paused || !scopes.length) return;
    const controller = new AbortController();
    const { signal } = controller;
    let running = false;
    let dirty = true;
    async function run() {
      dirty = true;
      if (running) return;
      running = true;
      try {
        while (dirty && !signal.aborted) {
          dirty = false;
          const work = async () => {
            const records = await cacheData.all<IndexMeta>("indexmeta");
            const known = new Map(records.map((row) => [row.key, row.version]));
            const files = (await cachedFiles()).filter(
              (file) => scopes.includes(file.scope) && indexable(file.name),
            );
            const pending = files.filter(
              (file) => known.get(fileCacheKey(file)) !== file.version,
            );
            let done = files.length - pending.length;
            for (const file of pending) {
              signal.throwIfAborted();
              setProgress({ done: ++done, total: files.length });
              await new Promise((resolve) => setTimeout(resolve, 0));
              const blob =
                file.size <= INDEX_FILE_LIMIT
                  ? await getCachedFile(file, false)
                  : undefined;
              if (blob || file.size > INDEX_FILE_LIMIT) {
                await textIndexJob({ type: "index", file, blob }, signal);
                window.dispatchEvent(new Event("shelf-text-index-changed"));
              }
            }
            const settled = await cacheData.all<IndexMeta>("indexmeta");
            if (!signal.aborted)
              setIssues(
                settled.filter(
                  (row) =>
                    scopes.includes(row.scope) &&
                    ["tooLarge", "scanned", "failed"].includes(row.state),
                ),
              );
          };
          if (navigator.locks)
            await navigator.locks.request("shelf-text-index", { signal }, work);
          else await work();
        }
      } finally {
        running = false;
        if (!signal.aborted) setProgress(undefined);
      }
    }
    const update = () => {
      void run().catch(() => {});
    };
    update();
    window.addEventListener("shelf-cache-changed", update);
    return () => {
      controller.abort();
      window.removeEventListener("shelf-cache-changed", update);
    };
  }, [scopeKey, paused]);
  if (!scopes.length) return null;
  return (
    <>
      {(progress || paused) && (
        <IndexingIndicator
          progress={paused ? undefined : progress}
          paused={paused}
          onToggle={() => {
            setProgress(undefined);
            setPaused((value) => !value);
          }}
        />
      )}
      {issues.length > 0 && (
        <details>
          <summary>{t("indexIssues", { count: issues.length })}</summary>
          <ul>
            {issues.map((item) => (
              <li key={item.key}>
                {item.name} · {t("index_" + item.state)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
