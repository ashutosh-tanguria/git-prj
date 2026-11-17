import { useState } from "react";
import {
  evaluateFile,
  evaluateRepo,
  evaluateName,
  evaluateVisibility,
  evaluateBatch,
} from "../services/guards";
import type { Repo } from "../services/library";
import { t } from "../i18n";
import { RepoMeter } from "./GuardViews";
import { VisibilityBadge } from "./VisibilityBadge";
import styles from "./Guards.module.css";
export function GuardReview({
  files,
  repo,
}: {
  files: readonly { name: string; size: number }[];
  repo: Repo;
}) {
  const [ack, setAck] = useState<string[]>([]),
    [publicConfirmed, setPublic] = useState(false),
    [override, setOverride] = useState(false),
    [explanation, setExplanation] = useState("");
  const visibility = repo.private ? "private" : "public",
    repoVerdict = evaluateRepo(
      repo.size ?? null,
      files.reduce((sum, f) => sum + f.size, 0),
    ),
    batch = evaluateBatch(files.map((f) => f.size));
  const confirm = (key: string) => ack.includes(key);
  const hasBlock =
    files.some((f) => evaluateFile(f.size).level === "block") ||
    batch.level === "block" ||
    (repoVerdict.level === "block" &&
      !(
        repoVerdict.code === "guardRepoBlock" &&
        override &&
        explanation.trim()
      ));
  const pending =
    files.some(
      (f, i) =>
        (evaluateFile(f.size).level === "warn" && !confirm("file" + i)) ||
        (evaluateName(f.name, visibility).level === "warn" &&
          !confirm("name" + i)),
    ) ||
    (repoVerdict.level === "warn" && !confirm("repo")) ||
    evaluateVisibility(visibility, publicConfirmed).level === "block";
  const check = (key: string, label: string) => (
    <label className={styles.confirm}>
      <input
        type="checkbox"
        checked={confirm(key)}
        onChange={(e) =>
          setAck(
            e.target.checked ? [...ack, key] : ack.filter((k) => k !== key),
          )
        }
      />
      {label}
    </label>
  );
  return (
    <section className={styles.review}>
      <VisibilityBadge visibility={visibility} />
      <RepoMeter
        repo={repo}
        added={files.reduce((sum, f) => sum + f.size, 0)}
      />
      {repoVerdict.level === "warn" && check("repo", t("guardRepoWarn"))}
      {repoVerdict.code === "guardRepoBlock" && (
        <>
          <label>
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            {t("repoOverride")}
          </label>
          <label>
            {t("explanation")}
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </label>
        </>
      )}
      {files.map((file, i) => {
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
                  <p>
                    {t("splitPlan")} {Math.ceil(file.size / (94 * 1024 * 1024))}{" "}
                    ×{" "}
                    {Math.ceil(
                      file.size /
                        Math.ceil(file.size / (94 * 1024 * 1024)) /
                        1024 /
                        1024,
                    )}{" "}
                    MB. {t("availableAfter")} M4
                  </p>
                )}
                <p>{t("providersUnavailable")}</p>
              </>
            ) : v.level === "warn" ? (
              <>
                {check("file" + i, t("stageAnyway"))}
                <p>{t("guardFileWarn")}</p>
                <p>{t("providersUnavailable")}</p>
              </>
            ) : v.level === "info" ? (
              <span className={styles.chip}>{t("large")}</span>
            ) : (
              <p>{t("guardFileOk")}</p>
            )}
            {name.level === "warn" && (
              <>
                <p>
                  {t("sensitiveWarning")} {String(name.params.match)} (
                  {visibility})
                </p>
                {check("name" + i, t("sensitiveConfirm"))}
              </>
            )}
          </article>
        );
      })}
      <p>{t(batch.code)}</p>
      {!repo.private && (
        <label className={styles.confirm}>
          <input
            type="checkbox"
            checked={publicConfirmed}
            onChange={(e) => setPublic(e.target.checked)}
          />
          {t("publicConfirm")}
        </label>
      )}
      {!hasBlock && !pending && <p role="status">{t("checksPassed")}</p>}
      <button disabled>{t("stageM3")}</button>
      <p>{t("nothingStaged")}</p>
    </section>
  );
}
