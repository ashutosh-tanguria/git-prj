import type { Entry, PushContext, StorageProvider } from "../providers/types";
import type { Hashes, HashKind } from "./transferHash";

export type TransferState =
  | "staged"
  | "reading"
  | "writing"
  | "verifying"
  | "verified"
  | "deleting"
  | "done"
  | "failed"
  | "cancelled";
export type ActiveState = Exclude<
  TransferState,
  "done" | "failed" | "cancelled"
>;
export interface TransferEndpoint {
  provider: Exclude<StorageProvider["id"], "local">;
  locationId: string;
  ref: string;
}
export type TransferSource =
  | { endpoint: TransferEndpoint; entry: Entry }
  | { entry: Pick<Entry, "name" | "size">; local: true };
export interface TransferDraft {
  source: TransferSource;
  target: TransferEndpoint;
  name: string;
  move: boolean;
  replace?: Entry;
  allowMissingParent?: boolean;
  folders?: string[];
}
export interface Transfer extends TransferDraft {
  id: string;
  size: number;
  createdAt: number;
  state: TransferState;
  resume?: ActiveState;
  attempted?: boolean;
  deleteAttempted?: boolean;
  createId?: string;
  directoryIds?: Record<number, string>;
  destinationRef?: string;
  saved?: Entry;
  hashes?: Hashes;
  contentType?: string;
  error?: string;
}
export type Approvals = Pick<
  PushContext,
  | "publicConfirmed"
  | "warningsConfirmed"
  | "sensitiveConfirmed"
  | "repoOverride"
>;
export type ResolveProvider = (
  endpoint: TransferEndpoint,
) => Promise<StorageProvider>;
export interface RunOptions {
  resolve: ResolveProvider;
  approvals?(endpoint: TransferEndpoint): Approvals | undefined;
  changed?(row: Transfer): void;
  progress?(row: Transfer, bytes: number): void;
}
export interface TransferStorage {
  load(): Promise<Transfer[] | undefined>;
  save(rows: Transfer[]): Promise<void>;
  get(key: string): Promise<Blob>;
  put(key: string, blob: Blob): Promise<void>;
  remove(key: string): Promise<void>;
  requestPersistence(): Promise<void>;
  spool(
    key: string,
    response: Response,
    size: number,
    progress: (bytes: number) => void,
    signal?: AbortSignal,
  ): Promise<Blob>;
}
export type TransferHasher = (
  blob: Blob,
  kinds: HashKind[],
  signal?: AbortSignal,
) => Promise<Hashes>;
