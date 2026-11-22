import { githubProvider } from "../providers/github/adapter";
import { isConnectedAs } from "../providers/github/client";
import type { StorageProvider } from "../providers/types";
import { parseOrganizer } from "./organizer";
import type { TransferEndpoint } from "./transferTypes";

export async function readPortableOrganizer(
  target: TransferEndpoint,
  account: string,
  cloudProvider?: StorageProvider,
) {
  const provider =
    target.provider === "github" && isConnectedAs(account)
      ? githubProvider(async () => {
          throw Error("organizerInvalid");
        })
      : cloudProvider;
  if (!provider) throw Error("organizerInvalid");
  const shelf = (await provider.list(target.ref)).find(
    (entry) => entry.name === ".shelf" && entry.kind === "dir",
  );
  const file =
    shelf &&
    (await provider.list(shelf.ref)).find(
      (entry) => entry.name === "collections.json" && entry.kind === "file",
    );
  if (file?.size == null || file.size > 2_000_000)
    throw Error("organizerInvalid");
  const blob = await provider.read(file.ref);
  if (blob.size > 2_000_000) throw Error("organizerInvalid");
  return parseOrganizer(await blob.text());
}
