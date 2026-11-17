import { request, ProviderError, type Repo } from "../providers/github/client";
import { repoRoot } from "./githubTree";
import {
  isLfsPointer,
  evaluateBatch,
  evaluateFile,
  evaluateName,
  evaluateRepo,
  evaluateVisibility,
} from "./guards";
import { staging } from "./workingStorage";
import {
  sameLocation,
  type GuardApproval,
  type OperationPlan,
  type PlannedChange,
} from "./folderTypes";
export function checkOperation(
  changes: PlannedChange[],
  repo: Repo,
  approval: GuardApproval,
  stagedBytes = 0,
) {
  const visibility =
    typeof repo.private !== "boolean"
      ? "unknown"
      : repo.private
        ? "private"
        : "public";
  const check = (v: ReturnType<typeof evaluateFile>, confirmed: boolean) => {
    if (v.level === "block" || (v.level === "warn" && !confirmed))
      throw new ProviderError(v.code);
  };
  check(evaluateVisibility(visibility, approval.publicConfirmed), false);
  for (const c of changes) {
    const size =
      c.kind === "delete" || c.kind === "rename" ? 0 : (c.blob?.size ?? c.size);
    check(evaluateFile(size), approval.warningsConfirmed);
    check(evaluateName(c.target.path, visibility), approval.sensitiveConfirmed);
  }
  const sizes = changes.map((c) =>
    c.kind === "delete" || c.kind === "rename" ? 0 : (c.blob?.size ?? c.size),
  );
  check(evaluateBatch(sizes), true);
  const repoVerdict = evaluateRepo(
    repo.size ?? null,
    stagedBytes + sizes.reduce((a, b) => a + b, 0),
  );
  if (!(repoVerdict.code === "guardRepoBlock" && approval.repoOverride?.trim()))
    check(repoVerdict, approval.warningsConfirmed);
}
export async function operationRepository(plan: OperationPlan) {
  const first = plan.changes[0];
  if (!first) throw new ProviderError("clipboardEmpty");
  const repo = (await (await request(repoRoot(first.target))).json()) as Repo;
  const stagedBytes = staging
    .snapshot()
    .filter(
      (c) =>
        !plan.replaceIds.includes(c.id) &&
        sameLocation(c.target, first.target) &&
        ["add", "modify"].includes(c.kind),
    )
    .reduce((sum, c) => sum + c.size, 0);
  return { repo, stagedBytes };
}
export async function stageOperation(
  plan: OperationPlan,
  approval: GuardApproval,
) {
  const { repo, stagedBytes } = await operationRepository(plan);
  checkOperation(plan.changes, repo, approval, stagedBytes);
  const actual = plan.changes.map((c) => ({ ...c }));
  const changes = plan.changes.map((c, index) => {
    const { readFrom, ...change } = c;
    return {
      ...change,
      loadBlob: readFrom
        ? async () => {
            const blob = await (
              await request(
                repoRoot(readFrom.ref) +
                  "/git/blobs/" +
                  encodeURIComponent(readFrom.sha),
                undefined,
                true,
              )
            ).blob();
            if (isLfsPointer(await blob.slice(0, 200).text()))
              throw new ProviderError("folderLfs");
            actual[index] = { ...change, size: blob.size };
            checkOperation(actual, repo, approval, stagedBytes);
            return blob;
          }
        : undefined,
    };
  });
  // One durable store transaction and one undo entry for the entire operation.
  const ids = new Set(changes.map((c) => c.id));
  await staging.stage(changes, plan.replaceIds, (next) => {
    const related = next.filter((c) =>
      sameLocation(c.target, changes[0].target),
    );
    const previous = related.filter((c) => !ids.has(c.id));
    const incoming = related.filter((c) => ids.has(c.id));
    if (
      incoming.some((c) =>
        previous.some(
          (old) =>
            old.target.path === c.target.path || old.oldPath === c.target.path,
        ),
      )
    )
      throw new ProviderError("folderPendingSource");
    checkOperation(
      incoming,
      repo,
      approval,
      previous
        .filter((c) => ["add", "modify"].includes(c.kind))
        .reduce((sum, c) => sum + c.size, 0),
    );
  });
}
