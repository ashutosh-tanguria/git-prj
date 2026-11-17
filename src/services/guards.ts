import { GITHUB } from "../lib/limits";

export type Level = "ok" | "info" | "warn" | "block";
export type Visibility = "public" | "private" | "unknown";
export interface Verdict {
  level: Level;
  code: string;
  params: Record<string, string | number>;
  actions: string[];
}
const verdict = (
  level: Level,
  code: string,
  params: Verdict["params"] = {},
  actions: string[] = [],
): Verdict => ({ level, code, params, actions });
function bytes(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError("Invalid byte count");
  return value;
}
export function evaluateFile(sizeBytes: number, isPdf = false): Verdict {
  const size = bytes(sizeBytes);
  if (size >= GITHUB.FILE_BLOCK_AT)
    return verdict("block", "guardFileBlock", { size }, isPdf ? ["otherProvider", "splitPdf"] : ["otherProvider"]);
  if (size >= GITHUB.FILE_WARN_AT)
    return verdict("warn", "guardFileWarn", { size }, ["confirm"]);
  if (size >= GITHUB.FILE_INFO_AT)
    return verdict("info", "guardFileInfo", { size });
  return verdict("ok", "guardFileOk", { size });
}
/** GitHub repo.size is KB; staged additions are bytes. Deletions never reduce history. */
export function evaluateRepo(
  reportedKB: number | null,
  stagedAddBytes = 0,
): Verdict {
  const added = bytes(stagedAddBytes);
  if (reportedKB === null) return verdict("block", "guardRepoUnknown");
  const reported = bytes(reportedKB);
  const projectedKB = reported + added / 1024;
  if (!Number.isSafeInteger(reported * 1024 + added))
    throw new RangeError("Invalid projected size");
  const params = { reportedKB: reported, stagedAddBytes: added, projectedKB };
  if (projectedKB >= GITHUB.REPO_BLOCK_KB)
    return verdict("block", "guardRepoBlock", params, [
      "overrideWithExplanation",
    ]);
  if (projectedKB >= GITHUB.REPO_RED_KB)
    return verdict("warn", "guardRepoWarn", params, ["confirm"]);
  if (projectedKB >= GITHUB.REPO_AMBER_KB)
    return verdict("info", "guardRepoInfo", params);
  return verdict("ok", "guardRepoOk", params);
}
/** Preserves order and never places an individual change across two commits. */
export function evaluateBatch(
  changes: readonly number[],
): Verdict & { batches: number[][] } {
  const batches: number[][] = [];
  let total = 0,
    current: number[] = [];
  for (const raw of changes) {
    const size = bytes(raw);
    if (size > GITHUB.BATCH_CAP)
      return {
        ...verdict("block", "guardBatchItemBlock", { size }),
        batches: [],
      };
    if (current.length && total + size > GITHUB.BATCH_CAP) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(size);
    total += size;
  }
  if (current.length) batches.push(current);
  return {
    ...verdict(
      batches.length > 1 ? "info" : "ok",
      batches.length > 1 ? "guardBatchSplit" : "guardBatchOk",
      { count: batches.length },
    ),
    batches,
  };
}
export function evaluateVisibility(
  visibility: Visibility,
  confirmed = false,
): Verdict {
  if (visibility === "unknown")
    return verdict("block", "guardVisibilityUnknown");
  if (visibility === "public" && !confirmed)
    return verdict("block", "guardVisibilityConfirm", {}, ["confirmPublic"]);
  return verdict(
    "ok",
    visibility === "public"
      ? "guardVisibilityPublic"
      : "guardVisibilityPrivate",
  );
}
export function evaluateName(
  name: string,
  visibility: Visibility,
  confirmed = false,
): Verdict {
  const match = name.match(
    /aadhaar|aadhar|passport|pan[\s_-]*card|marksheet|password|secret|(?:^|[\\/])\.env(?:$|[.])|id_rsa|\.pem$|\.key$|credentials/i,
  );
  if (!match) return verdict("ok", "guardNameOk");
  return verdict(
    "warn",
    "guardNameSensitive",
    { match: match[0].replace(/^[\\/]/, ""), visibility },
    visibility !== "private" && !confirmed ? ["confirmSensitive"] : [],
  );
}
export function isLfsPointer(content: string): boolean {
  return (
    content.split(/\r?\n/, 1)[0] ===
    "version https://git-lfs.github.com/spec/v1"
  );
}
