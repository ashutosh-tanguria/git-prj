import type { GitRef } from "../lib/refs";
import type { Change } from "./staging";
import { folderPath } from "./destinations";
import { ProviderError } from "../providers/github/client";
export function retargetAdds(rows: Change[], target: GitRef) {
  folderPath(target.path);
  if (
    !target.owner ||
    !target.repo ||
    !target.branch ||
    rows.some((c) => c.kind !== "add")
  )
    throw new ProviderError("destinationInvalid");
  const paths = new Set<string>();
  return rows.map((c) => {
    if (
      c.blobSha &&
      (c.target.owner !== target.owner || c.target.repo !== target.repo)
    )
      throw new ProviderError("folderRetargetReuse");
    if (c.groupLabel) folderPath(c.groupLabel);
    const parent = c.groupLabel?.split("/").slice(0, -1).join("/");
    const relative = c.groupLabel
      ? c.target.path.slice(parent ? parent.length + 1 : 0)
      : c.target.path.split("/").at(-1);
    const path = [target.path, relative].filter(Boolean).join("/");
    if (paths.has(path)) throw new ProviderError("destinationInvalid");
    paths.add(path);
    return {
      ...c,
      groupLabel: c.groupLabel
        ? [target.path, c.groupLabel.split("/").at(-1)]
            .filter(Boolean)
            .join("/")
        : undefined,
      baseVersion: undefined,
      baseSize: undefined,
      target: { ...target, path },
    };
  });
}
