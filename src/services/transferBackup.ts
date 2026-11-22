import { transferBytesKey, transferPending } from "./transferJournal";
import { transfers } from "./transfers";
import { transferStorage } from "./workingStorage";
import { exportWorkingArchive, parseWorkingArchive } from "./workingBackup";
import type { TransferDraft, TransferEndpoint, TransferSource } from "./transferTypes";

function endpoint(value: TransferEndpoint) {
  if (
    !value ||
    !["github", "gdrive", "dropbox", "onedrive"].includes(value.provider) ||
    typeof value.ref !== "string" ||
    !value.ref ||
    typeof value.locationId !== "string" ||
    !value.locationId
  )
    throw Error("workingInvalid");
  return {
    provider: value.provider,
    ref: value.ref,
    locationId: value.locationId,
  };
}
function pickDraft(value: TransferDraft): TransferDraft {
  if (
    !value ||
    !value.source?.entry ||
    typeof value.source.entry.name !== "string" ||
    !Number.isSafeInteger(value.source.entry.size) ||
    typeof value.name !== "string" ||
    typeof value.move !== "boolean" ||
    (value.folders &&
      (!Array.isArray(value.folders) ||
        value.folders.some((folder) => typeof folder !== "string")))
  )
    throw Error("workingInvalid");
  const { source, name, move, folders, replace, allowMissingParent } = value;
  const from: TransferSource =
    "local" in source
      ? {
          local: true as const,
          entry: { name: source.entry.name, size: source.entry.size },
        }
      : { endpoint: endpoint(source.endpoint), entry: source.entry };
  if ("endpoint" in from && from.entry.ref !== from.endpoint.ref)
    throw Error("workingInvalid");
  return {
    source: from,
    target: endpoint(value.target),
    name,
    move,
    folders,
    replace,
    allowMissingParent: allowMissingParent === true,
  };
}

export async function exportTransfers() {
  const records: {
    draft: TransferDraft;
    bytesKey?: string;
    contentType?: string;
  }[] = [];
  const files: { name: string; data: Blob }[] = [];
  for (const row of (await transfers.load()).filter(transferPending)) {
    const draft = pickDraft(row);
    const bytesKey =
      "local" in draft.source ? transferBytesKey(row) : undefined;
    if (bytesKey)
      files.push({ name: bytesKey, data: await transferStorage.get(bytesKey) });
    records.push({ draft, bytesKey, contentType: row.contentType });
  }
  return exportWorkingArchive({ version: 1, transfers: records }, files);
}

export async function parseTransferBackup(archive: Blob) {
  const { manifest, files } = await parseWorkingArchive(archive);
  const parsed = JSON.parse(manifest) as {
    version: number;
    transfers: {
      draft: TransferDraft;
      bytesKey?: string;
      contentType?: string;
    }[];
  };
  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.transfers) ||
    !parsed.transfers.length
  )
    throw Error("workingInvalid");
  return parsed.transfers.map(({ draft: value, bytesKey, contentType }) => {
    const draft = pickDraft(value);
    const cached =
      typeof bytesKey === "string" ? files.get(bytesKey) : undefined;
    if ("local" in draft.source && !cached) throw Error("workingInvalid");
    return {
      draft,
      bytes:
        cached &&
        new Blob([cached], {
          type: typeof contentType === "string" ? contentType : undefined,
        }),
    };
  });
}

export async function restoreTransfers(archive: Blob) {
  // Restored drafts always start at staged. Provider receipts in an archive
  // cannot authorize a deletion or bypass a fresh verification.
  await transfers.stage(await parseTransferBackup(archive));
}
