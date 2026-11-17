import { library } from "./library";
import { request } from "../providers/github/client";
import { staging } from "./workingStorage";
import { retargetAdds } from "./retarget";
import type { GitRef } from "../lib/refs";
export async function applyDestination(target: GitRef) {
  await staging.update((rows) => retargetAdds(rows, target));
}
export const defaultDestinationSource = {
  ...library,
  branches: async (repository: string, signal: AbortSignal) => {
    const values = (await (
      await request(
        "/repos/" +
          repository.split("/").map(encodeURIComponent).join("/") +
          "/branches?per_page=100",
        signal,
      )
    ).json()) as { name: string }[];
    return values.map((value) => value.name);
  },
};
