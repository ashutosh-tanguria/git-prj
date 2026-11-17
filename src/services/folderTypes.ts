import type { GitRef } from "../lib/refs";
import type { Change } from "./staging";
export type CollisionChoice = "both" | "replace";
export type PlannedChange = Change & {
  blob?: Blob;
  readFrom?: { ref: GitRef; sha: string };
};
export interface OperationPlan {
  changes: PlannedChange[];
  replaceIds: string[];
  fallback: boolean;
  caseWarning?: boolean;
}
export class FolderCollision extends Error {
  constructor(public paths: string[]) {
    super("folderCollision");
  }
}
export interface GuardApproval {
  publicConfirmed: boolean;
  warningsConfirmed: boolean;
  sensitiveConfirmed: boolean;
  repoOverride?: string;
}
export const sameLocation = (a: GitRef, b: GitRef) =>
  a.owner === b.owner && a.repo === b.repo && a.branch === b.branch;
export const containsPath = (root: string, path: string) =>
  path === root || path.startsWith(root + "/");
