import { lazy, Suspense } from "react";
import type { Repo, Entry } from "../services/library";
import type { GitRef } from "../lib/refs";
import type { CloudLibrary } from "./cloudTypes";
const Controller = lazy(() =>
  import("./GuardController").then((m) => ({ default: m.GuardController })),
);
export function GuardMount({
  roots,
  current,
  entries,
  account,
  cloud,
}: {
  roots: Repo[];
  current: GitRef;
  entries: Entry[];
  account?: string;
  cloud?: CloudLibrary;
}) {
  const repo = roots.find(
    (repo) => repo.full_name === current.owner + "/" + current.repo,
  ) || {
    full_name: current.owner + "/" + current.repo,
    default_branch: current.branch,
    private: false,
  };
  return (
    <Suspense fallback={null}>
      <Controller repo={repo} entries={entries} current={current} account={account} cloud={cloud} />
    </Suspense>
  );
}
