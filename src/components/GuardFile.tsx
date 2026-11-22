import type { ReactNode } from "react";
import { evaluateFile, evaluateName } from "../services/guards";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { PDF_PART_BYTES } from "../services/pdfSplitLimits";
import { MiB } from "../lib/limits";
import styles from "./Guards.module.css";
export function GuardFile({
  file,
  i,
  visibility,
  check,
  remedies,
  onSplit,
}: {
  file: { name: string; size: number };
  i: number;
  visibility: "private" | "public";
  check: (key: string, label: string) => ReactNode;
  remedies?: ReactNode;
  onSplit?(): void;
}) {
  const v = evaluateFile(file.size, /\.pdf$/i.test(file.name)),
    name = evaluateName(file.name, visibility);
  return (
    <article key={i} data-level={v.level}>
      <h3>{file.name}</h3>
      <p>
        {file.size} {t("bytes")}
      </p>
      {v.level === "block" ? (
        <>
          <h3>{t("fileTooLarge")}</h3>
          <p>{t("guardFileBlock")}</p>
          {/\.pdf$/i.test(file.name) && (
            <>
              <p>{t("splitPlan")} {Math.ceil(file.size / PDF_PART_BYTES)} × {PDF_PART_BYTES / MiB} MB</p>
              {onSplit && <Button onPress={onSplit}>{t("splitPdf")}</Button>}
            </>
          )}
          {remedies || <p>{t("providersUnavailable")}</p>}
        </>
      ) : v.level === "warn" ? (
        <>
          {check("file" + i, t("stageAnyway"))}
          <p>{t("guardFileWarn")}</p>
          {remedies || <p>{t("providersUnavailable")}</p>}
        </>
      ) : v.level === "info" ? (
        <span className={styles.chip}>{t("large")}</span>
      ) : (
        <p>{t("guardFileOk")}</p>
      )}
      {name.level === "warn" && (
        <>
          <p>
            {t("sensitiveWarning")} {String(name.params.match)} ({visibility})
          </p>
          {check("name" + i, t("sensitiveConfirm"))}
        </>
      )}
    </article>
  );
}
