import type { GitRef } from "../lib/refs";
import type { Verdict } from "./guards";
export interface Destination extends GitRef {
  provider: "github";
}
export function destinationKey(d: GitRef) {
  return JSON.stringify([d.owner, d.repo, d.branch, d.path]);
}
export function folderPath(value: string) {
  if (
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.split("/").some((s) => [".", "..", ".git"].includes(s))
  )
    throw Error("destinationInvalid");
  return value;
}
export function canQuickPush({
  privateRepo,
  used,
  verdicts,
  conflict,
  destination,
  pinned,
  lastUsed,
}: {
  privateRepo: boolean;
  used: boolean;
  verdicts: Verdict[];
  conflict: boolean;
  destination: GitRef;
  pinned?: GitRef;
  lastUsed?: GitRef;
}) {
  const key = destinationKey(destination);
  return (
    privateRepo &&
    used &&
    !conflict &&
    verdicts.length > 0 &&
    verdicts.every((v) => v.level === "ok") &&
    [pinned, lastUsed].some((d) => d && destinationKey(d) === key)
  );
}
