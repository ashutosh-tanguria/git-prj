import { GuardFile } from "./GuardFile";
import type { GuardApproval } from "../services/folderTypes";
import "../i18n/working";
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
  onStage,
  stagedBytes = 0,
}: {
  files: readonly { name: string; size: number }[];
  repo: Repo;
  onStage?: (approval: GuardApproval) => Promise<void>;
  stagedBytes?: number;
}) {
  const [ack, setAck] = useState<string[]>([]),
    [publicConfirmed, setPublic] = useState(false),
    [override, setOverride] = useState(false),
    [explanation, setExplanation] = useState("");
  const visibility = repo.private ? "private" : "public",
    repoVerdict = evaluateRepo(
      repo.size ?? null,
      stagedBytes + files.reduce((sum, f) => sum + f.size, 0),
    ),
    batch = evaluateBatch(files.map((f) => f.size));
  const [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState("");
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
      {files.map((file, i) => (
        <GuardFile
          key={i}
          file={file}
          i={i}
          visibility={visibility}
          check={check}
        />
      ))}
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
      <button
        disabled={!onStage || hasBlock || pending || saving}
        onClick={() => {
          setSaving(true);
          setSaveError("");
          void onStage?.({
            publicConfirmed,
            warningsConfirmed:
              (files.some((f) => evaluateFile(f.size).level === "warn") ||
                repoVerdict.level === "warn") &&
              !files.some(
                (f, i) =>
                  evaluateFile(f.size).level === "warn" && !confirm("file" + i),
              ) &&
              (repoVerdict.level !== "warn" || confirm("repo")),
            sensitiveConfirmed: !files.some(
              (f, i) =>
                evaluateName(f.name, visibility).level === "warn" &&
                !confirm("name" + i),
            ),
            repoOverride: override ? explanation : undefined,
          })
            .catch((error) =>
              setSaveError(
                error instanceof Error && t(error.message) !== error.message
                  ? error.message
                  : "workingError",
              ),
            )
            .finally(() => setSaving(false));
        }}
      >
        {t(saving ? "workingBusy" : onStage ? "workingStage" : "stageM3")}
      </button>
      {saveError && <p role="alert">{t(saveError)}</p>}
      <p>{t("nothingStaged")}</p>
    </section>
  );
}
