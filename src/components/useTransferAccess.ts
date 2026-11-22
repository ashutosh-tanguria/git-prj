import { useCallback, useMemo } from "react";
import { githubProvider } from "../providers/github/adapter";
import { isConnectedAs } from "../providers/github/client";
import { parseRef, type GitRef } from "../lib/refs";
import { t } from "../i18n";
import type { Repo } from "../services/library";
import { githubEndpoint } from "../services/transferRequests";
import type { ResolveProvider } from "../services/transferTypes";
import type { CloudLibrary } from "./cloudTypes";
import type { TransferLocation } from "./TransferPicker";

const github = githubProvider(async () => {
  throw Error("transferAccountChanged");
});
export interface TransferAccess {
  account: string;
  roots: Repo[];
  current: GitRef | null;
  cloud?: CloudLibrary;
}
export function useTransferAccess({
  account,
  roots,
  current,
  cloud,
}: TransferAccess) {
  const resolve = useCallback<ResolveProvider>(
    async (endpoint) => {
      if (endpoint.provider === "github") {
        const { owner, repo } = parseRef(endpoint.ref);
        if (
          endpoint.locationId === account + ":" + owner + "/" + repo &&
          isConnectedAs(account)
        )
          return github;
      } else {
        const provider = cloud?.transferProvider(endpoint);
        if (provider) return provider;
      }
      throw Error("transferAccountChanged");
    },
    [account, cloud],
  );
  const locations = useMemo<TransferLocation[]>(() => {
    const result: TransferLocation[] = [];
    for (const root of cloud?.locations.roots ?? []) {
      if (root.provider === "github" || root.provider === "local") continue;
      const endpoint = {
        provider: root.provider,
        locationId: root.id,
        ref: root.root,
      };
      if (cloud?.transferProvider(endpoint))
        result.push({ label: t(root.provider), endpoint });
    }
    if (account)
      for (const repo of roots) {
        const [owner, name] = repo.full_name.split("/");
        const branches = [repo.default_branch];
        if (
          current?.owner === owner &&
          current.repo === name &&
          current.branch !== repo.default_branch
        )
          branches.push(current.branch);
        for (const branch of branches)
          result.push({
            endpoint: githubEndpoint(account, {
              owner,
              repo: name,
              branch,
              path: "",
            }),
            label: repo.full_name + " · " + branch,
          });
      }
    return result;
  }, [account, roots, cloud, current]);
  return { resolve, locations };
}
