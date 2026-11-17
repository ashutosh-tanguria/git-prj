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
    const path = [target.path, c.target.path.split("/").at(-1)]
      .filter(Boolean)
      .join("/");
    if (paths.has(path)) throw new ProviderError("destinationInvalid");
    paths.add(path);
    return {
      ...c,
      baseVersion: undefined,
      baseSize: undefined,
      target: { ...target, path },
    };
  });
}
