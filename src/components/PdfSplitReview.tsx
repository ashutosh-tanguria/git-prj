import { useEffect, useState, useSyncExternalStore } from "react";
import { t } from "../i18n";
import type { GitRef } from "../lib/refs";
import type { Entry, Repo } from "../services/library";
import { stageOperation } from "../services/stageOperation";
import { staging } from "../services/workingStorage";
import { evaluateFile } from "../services/guards";
import { sameLocation } from "../services/folderTypes";
import { checkPdfSplitSize } from "../services/pdfSplitLimits";
import { splitPdfInWorker } from "../services/pdfSplitClient";
import { Button } from "../ui/Button";
import { GuardReview } from "./GuardReview";

export interface PdfSplitSource {
  name: string;
  size: number;
  read(signal: AbortSignal): Promise<Blob>;
}
export function PdfSplitReview({
  source,
  target,
  entries,
  repo,
  onClose,
  onStaged,
}: {
  source: PdfSplitSource;
  target: GitRef;
  entries: Entry[];
  repo: Repo;
  onClose(): void;
  onStaged(): void;
}) {
  const [parts, setParts] = useState<File[]>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [error, setError] = useState("");
  const pending = useSyncExternalStore(staging.subscribe, staging.snapshot);
  const pathFor = (name: string) =>
    [target.path, name].filter(Boolean).join("/");
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        checkPdfSplitSize(source.size);
        const file = await source.read(controller.signal);
        const result = await splitPdfInWorker(
          file,
          source.name,
          controller.signal,
          (done, total) => setProgress({ done, total }),
        );
        if (!controller.signal.aborted) setParts(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = (error as Error).message;
        setError(code.startsWith("splitPdf") ? code : "splitPdfReadFailed");
      }
    })();
    return () => controller.abort();
  }, [source]);
  return (
    <section>
      <h3>
        {t("splitPdf")} · {source.name}
      </h3>
      <p>{t("splitPdfKeepOriginal")}</p>
      {!parts && !error && <p role="status">{t("splitPdfWorking")}</p>}
      {!parts && progress && (
        <progress
          aria-label={t("splitPdf")}
          value={progress.done}
          max={progress.total}
        />
      )}
      {error && <p role="alert">{t(error)}</p>}
      {parts && (
        <GuardReview
          files={parts.map((file) => ({
            size: file.size,
            name: pathFor(file.name),
          }))}
          repo={repo}
          stagedBytes={pending
            .filter(
              (row) =>
                sameLocation(row.target, target) &&
                (row.kind === "add" || row.kind === "modify"),
            )
            .reduce((sum, row) => sum + row.size, 0)}
          onStage={async (approval) => {
            const changes = parts.map((file) => {
              const path = pathFor(file.name);
              if (
                entries.some((entry) => entry.path === path) ||
                pending.some(
                  (row) =>
                    sameLocation(row.target, target) &&
                    (row.target.path === path || row.oldPath === path),
                )
              )
                throw Error("splitPdfCollision");
              return {
                id: crypto.randomUUID(),
                kind: "add" as const,
                target: { ...target, path },
                size: file.size,
                blob: file,
                createdAt: Date.now(),
                verdict: evaluateFile(file.size),
              };
            });
            await stageOperation(
              { changes, replaceIds: [], fallback: false },
              approval,
            );
            onStaged();
          }}
        />
      )}
      <Button onPress={onClose}>{t("cancel")}</Button>
    </section>
  );
}
