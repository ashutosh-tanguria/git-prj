import "../i18n/m3c";
import { useEffect, useRef, useState } from "react";
import {
  FolderCollision,
  type CollisionChoice,
  type OperationPlan,
} from "../services/folderTypes";
import {
  operationRepository,
  stageOperation,
} from "../services/stageOperation";
import { FolderCollisionReview } from "./FolderCollisionReview";
import { GuardReview } from "./GuardReview";
import type { Repo } from "../services/library";
import { t } from "../i18n";
export type OperationJob = (choice?: CollisionChoice) => Promise<OperationPlan>;
export function OperationReview({
  job,
  onClose,
  onStaged,
}: {
  job: OperationJob;
  onClose: () => void;
  onStaged?: () => void;
}) {
  const focus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => focus.current?.focus());
    return () => cancelAnimationFrame(frame);
  });
  const [result, setResult] = useState<{
      plan: OperationPlan;
      repo: Repo;
      stagedBytes: number;
    }>(),
    [collisions, setCollisions] = useState<string[]>(),
    [error, setError] = useState(""),
    [choice, setChoice] = useState<CollisionChoice>();
  useEffect(() => {
    let active = true;
    setResult(undefined);
    setCollisions(undefined);
    setError("");
    void job(choice)
      .then(async (plan) => ({ plan, ...(await operationRepository(plan)) }))
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof FolderCollision) setCollisions(error.paths);
        else setError(error instanceof Error ? error.message : "commandError");
      });
    return () => {
      active = false;
    };
  }, [job, choice]);
  if (collisions)
    return (
      <div ref={focus} tabIndex={-1}>
        <FolderCollisionReview
          paths={collisions}
          onChoose={setChoice}
          onCancel={onClose}
        />
      </div>
    );
  if (error)
    return (
      <div ref={focus} tabIndex={-1}>
        <p role="alert">{t(error) === error ? t("workingError") : t(error)}</p>
      </div>
    );
  if (!result) return <p role="status">{t("folderPlanning")}</p>;
  return (
    <div ref={focus} tabIndex={-1}>
      {result.plan.caseWarning && <p role="status">{t("folderCaseWarning")}</p>}
      {result.plan.fallback && <p role="status">{t("folderFallback")}</p>}
      <p>{t("folderPlanCount", { count: result.plan.changes.length })}</p>
      <GuardReview
        files={result.plan.changes.map((c) => ({
          name: c.target.path,
          size: c.kind === "delete" || c.kind === "rename" ? 0 : c.size,
        }))}
        repo={result.repo}
        stagedBytes={result.stagedBytes}
        onStage={async (approval) => {
          await stageOperation(result.plan, approval);
          (onStaged ?? onClose)();
        }}
      />
    </div>
  );
}
