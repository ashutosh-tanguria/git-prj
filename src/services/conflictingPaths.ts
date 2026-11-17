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
      if (
        [c.folderBase, c.replaceTree].some(
          (base) =>
            base &&
            remote.tree.find((n) => n.path === base.path)?.sha !== base.sha,
        )
      )
        return true;
      return c.kind === "add"
        ? !!existing && existing.sha !== c.replaceVersion
        : !existing ||
            !c.baseVersion ||
            existing.sha !== c.baseVersion ||
            ["120000", "160000"].includes(existing.mode) ||
            (c.kind === "rename" &&
              remote.tree.some(
                (e) => e.path === c.target.path && e.sha !== c.replaceVersion,
              ));
    })
    .map((c) => c.target.path);
}
