export type ProviderId = "github" | "gdrive" | "dropbox" | "onedrive" | "local";
export type CloudId = "gdrive" | "dropbox" | "onedrive";
export interface Capabilities {
  maxFileBytes: number | null;
  hasFolders: boolean;
  hasVersions: boolean;
  atomicBatch: boolean;
  hashKind: "git-sha1" | "md5" | "dropbox-sha256" | "sha1" | "quickxor" | null;
}
export interface Location {
  id: string;
  provider: ProviderId;
  label: string;
  root: string;
  branch?: string;
  private?: boolean;
}
export interface Entry {
  ref: string;
  name: string;
  kind: "file" | "dir" | "special";
  size: number | null;
  modified: string | null;
  hash: string | null;
  version: string | null;
}
export interface Change {
  id: string;
  op: "add" | "modify" | "delete" | "rename" | "mkdir";
  ref: string;
  parent?: string;
  name?: string;
  baseVersion?: string;
  bytesKey?: string;
  size?: number;
}
export interface VersionInfo {
  id: string;
  modified: string | null;
  label: string;
}
export interface PushContext {
  signal?: AbortSignal;
  readBytes(key: string): Promise<Blob>;
  onAttempt?(id: string): Promise<void>;
  onProgress?(id: string, sent: number, total: number): void;
  // Must durably record each success before the next remote operation.
  onComplete?(id: string, entry?: Entry): Promise<void>;
  message?: string;
  publicConfirmed?: boolean;
  warningsConfirmed?: boolean;
  sensitiveConfirmed?: boolean;
}
export interface PushResult {
  completed: string[];
  failed?: { id: string; error: ProviderError };
}
export interface StorageProvider {
  readonly id: ProviderId;
  readonly capabilities: Capabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listRoots(): Promise<Location[]>;
  list(ref: string, opts?: { signal?: AbortSignal }): Promise<Entry[]>;
  stat(ref: string): Promise<Entry>;
  read(
    ref: string,
    opts?: {
      signal?: AbortSignal;
      onProgress?(n: number, total: number): void;
      version?: string;
    },
  ): Promise<Blob>;
  push(changes: Change[], ctx: PushContext): Promise<PushResult>;
  history(ref: string): Promise<VersionInfo[]>;
  quota(): Promise<{ used: number; total: number } | null>;
}
export class ProviderError extends Error {
  readonly userMessage: string;
  constructor(
    public code: string,
    public retryable = false,
    public details: { retryAfter?: number; uncertain?: boolean } = {},
  ) {
    super(code);
    this.userMessage = "provider" + code;
  }
}
