import {
  ProviderError,
  type StorageProvider,
  type CloudId,
  type Capabilities,
  type Change,
  type PushContext,
  type Entry,
  type Location,
  type VersionInfo,
} from "./types";
import type { Auth, AccessToken } from "./auth";
import { providerFetch } from "./http";
export abstract class SequentialProvider implements StorageProvider {
  abstract readonly id: CloudId;
  abstract readonly capabilities: Capabilities;
  private token?: AccessToken;
  constructor(
    private auth: Auth,
    private hosts: readonly string[],
  ) {}
  async connect() {
    this.token = await this.auth.acquire(true);
  }
  async disconnect() {
    this.token = undefined;
    await this.auth.clear();
  }
  isConnected() {
    return !!this.token;
  }
  protected async request(url: string, init: RequestInit = {}, bearer = true) {
    if (!this.token) throw new ProviderError("AUTH_EXPIRED");
    if (this.token.expiresAt <= Date.now()) {
      try {
        this.token = await this.auth.acquire(false);
      } catch {
        this.token = undefined;
        throw new ProviderError("AUTH_EXPIRED");
      }
    }
    return providerFetch(
      url,
      this.hosts,
      {
        ...init,
        headers: {
          ...(bearer ? { Authorization: "Bearer " + this.token.value } : {}),
          ...init.headers,
        },
      },
      async () => {
        this.token = undefined;
        await this.auth.clear();
      },
    );
  }
  abstract listRoots(): Promise<Location[]>;
  abstract list(ref: string, opts?: { signal?: AbortSignal }): Promise<Entry[]>;
  abstract stat(ref: string): Promise<Entry>;
  abstract read(
    ref: string,
    opts?: {
      signal?: AbortSignal;
      onProgress?(n: number, total: number): void;
      version?: string;
    },
  ): Promise<Blob>;
  abstract history(ref: string): Promise<VersionInfo[]>;
  abstract quota(): Promise<{ used: number; total: number } | null>;
  protected abstract write(
    c: Change,
    blob: Blob | undefined,
    ctx: PushContext,
  ): Promise<Entry | undefined>;
  async push(changes: Change[], ctx: PushContext) {
    const completed: string[] = [];
    for (const c of changes) {
      try {
        ctx.signal?.throwIfAborted();
        if (c.op !== "add" && c.op !== "mkdir") {
          const entry = await this.stat(c.ref);
          if (!c.baseVersion || entry.version !== c.baseVersion)
            throw new ProviderError("CONFLICT");
        }
        if (c.op === "add" || c.op === "mkdir" || c.op === "rename") {
          if (
            !c.name ||
            /[\x00-\x1f/\\]/.test(c.name) ||
            [".", ".."].includes(c.name)
          )
            throw new ProviderError("PERMISSION");
          const siblings = await this.list(c.parent || c.ref, {
            signal: ctx.signal,
          });
          if (
            siblings.some(
              (e) =>
                e.name.normalize("NFC").toLocaleLowerCase() ===
                  c.name!.normalize("NFC").toLocaleLowerCase() &&
                e.ref !== (c.op === "rename" ? c.ref : ""),
            )
          )
            throw new ProviderError("CONFLICT");
        }
        const blob = c.bytesKey ? await ctx.readBytes(c.bytesKey) : undefined;
        if ((c.op === "add" || c.op === "modify") && !blob)
          throw new ProviderError("NOT_FOUND");
        const quota = blob ? await this.quota() : null;
        if (quota && blob!.size > quota.total - quota.used)
          throw new ProviderError("QUOTA");
        await ctx.onAttempt?.(c.id);
        const entry = await this.write(c, blob, ctx);
        await ctx.onComplete?.(c.id, entry);
        completed.push(c.id);
      } catch (error) {
        return {
          completed,
          failed: {
            id: c.id,
            error:
              error instanceof ProviderError
                ? error
                : new ProviderError(
                    ctx.signal?.aborted ? "CANCELLED" : "UNKNOWN",
                    false,
                    { uncertain: true },
                  ),
          },
        };
      }
    }
    return { completed };
  }
}
