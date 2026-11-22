import { parseRef, refString, type GitRef } from "../lib/refs";
import type { Entry } from "./library";
import type { TransferEndpoint, TransferSource } from "./transferTypes";

export interface TransferRequest {
  items: { source: TransferSource; bytes?: Blob }[];
  move: boolean;
  target?: TransferEndpoint;
  cloudOnly?: boolean;
  onStaged?(): void;
}
export function requestTransfer(request: TransferRequest) {
  window.dispatchEvent(new CustomEvent("shelf-transfer", { detail: request }));
}
export function githubEndpoint(account: string, ref: GitRef): TransferEndpoint {
  return {
    provider: "github",
    locationId: account + ":" + ref.owner + "/" + ref.repo,
    ref: refString(ref),
  };
}
export function githubTransferSource(
  account: string,
  row: Entry,
): TransferSource {
  return {
    endpoint: githubEndpoint(account, parseRef(row.ref)),
    entry: {
      ...row,
      hash: row.sha,
      version: row.sha,
      modified: row.modified ?? null,
    },
  };
}
export function localTransferSource(file: File) {
  return {
    source: {
      local: true as const,
      entry: { name: file.name, size: file.size },
    },
    bytes: file,
  };
}
let transferClipboard: Pick<TransferRequest, "items" | "move"> | undefined;
export function transferClipboardSet(value: typeof transferClipboard) {
  transferClipboard = value;
}
export function transferClipboardGet() {
  return transferClipboard;
}
