import type { Change } from "./staging";
export interface RemoteTree {
  tree: { path: string; sha: string; mode: string }[];
  truncated?: boolean;
}
export function conflictingPaths(changes: Change[], remote: RemoteTree) {
  if (remote.truncated) throw Error("pushTruncated");
  return changes
    .filter((c) => {
      const existing = remote.tree.find(
        (e) => e.path === (c.oldPath || c.target.path),
      );
      return c.kind === "add"
        ? !!existing
        : !existing ||
            !c.baseVersion ||
            existing.sha !== c.baseVersion ||
            ["120000", "160000"].includes(existing.mode) ||
            (c.kind === "rename" &&
              remote.tree.some((e) => e.path === c.target.path));
    })
    .map((c) => c.target.path);
}
