import {
  ProviderError,
  type Entry,
  type PushContext,
  type StorageProvider,
} from "../providers/types";
import { evaluateBatch, evaluateFile, isLfsPointer } from "./guards";
import type { HashKind } from "./transferHash";
import type {
  ActiveState,
  RunOptions,
  Transfer,
  TransferDraft,
  TransferEndpoint,
  TransferHasher,
  TransferStorage,
} from "./transferTypes";

const normalized = (name: string) => name.normalize("NFC").toLowerCase();
const equalName = (provider: StorageProvider, a: string, b: string) =>
  provider.id === "github" ? a === b : normalized(a) === normalized(b);
const sourceKey = (row: Transfer) => "transfer-" + row.id;
const verificationKey = (row: Transfer) => sourceKey(row) + "-verify";
const mismatch = "transferNotVerified";
const hashPatterns: Record<Exclude<HashKind, "sha256">, RegExp> = {
  md5: /^[0-9a-f]{32}$/i,
  sha1: /^[0-9a-f]{40}$/i,
  "git-sha1": /^[0-9a-f]{40}$/i,
  "dropbox-sha256": /^[0-9a-f]{64}$/i,
  quickxor: /^[a-z\d+/]{27}=$/i,
};
export const transferPending = (row: Transfer) =>
  row.state !== "done" && row.state !== "cancelled";

export async function transferTargetEntry(
  provider: StorageProvider,
  ref: string,
  name: string,
  signal?: AbortSignal,
) {
  const entries = await provider
    .list(ref, { signal })
    .catch((error: unknown) => {
      if (
        provider.id === "github" &&
        error instanceof ProviderError &&
        error.code === "EMPTY_REPO"
      )
        return [];
      throw error;
    });
  const matches = entries.filter((entry) =>
    equalName(provider, entry.name, name),
  );
  if (matches.length > 1) throw Error("transferConflict");
  return matches[0];
}

function limit(
  target: TransferEndpoint,
  size: number,
  provider?: StorageProvider,
) {
  if (target.provider === "github") {
    const file = evaluateFile(size);
    if (file.level === "block") throw Error(file.code);
    const batch = evaluateBatch([size]);
    if (batch.level === "block") throw Error(batch.code);
  }
  const maximum = provider?.capabilities.maxFileBytes;
  if (maximum != null && size > maximum) throw new ProviderError("TOO_LARGE");
}

function checkDraft(draft: TransferDraft) {
  const { source, target, name, replace } = draft;
  const size = source.entry.size;
  if (size === null || !Number.isSafeInteger(size) || size < 0)
    throw Error("transferUnknownSize");
  if (
    !name ||
    /[\x00-\x1f/\\]/.test(name) ||
    [".", "..", ".git"].includes(name)
  )
    throw Error("pushPath");
  if (replace && (replace.kind !== "file" || !replace.version))
    throw Error("transferConflict");
  if ("endpoint" in source) {
    if (source.entry.kind !== "file" || !source.entry.version)
      throw Error("transferUnsupportedSource");
    if (
      source.endpoint.provider === target.provider &&
      source.entry.ref === replace?.ref
    )
      throw Error("transferSameFile");
  } else if (draft.move) {
    throw Error("transferUnsupportedSource");
  }
  limit(target, size);
  return size;
}

function checkedVersion(entry: Entry | undefined, expected: Entry | undefined) {
  if (!entry && !expected) return true;
  return (
    !!entry &&
    !!expected?.version &&
    entry.ref === expected.ref &&
    entry.version === expected.version
  );
}

async function stat(provider: StorageProvider, ref: string) {
  return provider.stat(ref).catch((error: unknown) => {
    if (error instanceof ProviderError && error.code === "NOT_FOUND")
      return undefined;
    throw error;
  });
}

export function createTransferJournal(
  storage: TransferStorage,
  lock: <T>(action: () => Promise<T>) => Promise<T>,
  hash: TransferHasher,
) {
  const load = async () => (await storage.load()) ?? [];
  const active = new Map<
    string,
    { controller: AbortController; deleting: boolean }
  >();
  const cancellations = new Set<string>();
  const save = async (row: Transfer) => {
    const rows = await load();
    await storage.save(
      rows.map((stored) => (stored.id === row.id ? row : stored)),
    );
  };
  const cleanup = (row: Transfer) =>
    storage.remove(sourceKey(row)).catch(() => undefined);

  async function execute(
    initial: Transfer,
    options: RunOptions,
    activity: { controller: AbortController; deleting: boolean },
  ) {
    const signal = activity.controller.signal;
    let row = initial;
    const update = async (changes: Partial<Transfer>) => {
      const next = { ...row, ...changes };
      await save(next);
      row = next;
      options.changed?.(row);
    };
    const advance = (state: ActiveState, changes?: Partial<Transfer>) =>
      update({ state, resume: undefined, error: undefined, ...changes });
    const progress = (bytes: number) => options.progress?.(row, bytes);
    const ctx = (endpoint: TransferEndpoint): PushContext => ({
      ...options.approvals?.(endpoint),
      signal,
      deferVerification: true,
      readBytes: async (key) => {
        const bytes = await storage.get(key);
        return row.contentType
          ? new Blob([bytes], { type: row.contentType })
          : bytes;
      },
      onProgress: (_, bytes) => progress(bytes),
    });
    const spool = (
      provider: StorageProvider,
      ref: string,
      key: string,
      blobSha?: string,
    ) =>
      provider.read(ref, {
        signal,
        blobSha,
        consume: (response) =>
          storage.spool(key, response, row.size, progress, signal),
      });
    const finish = async (state: "done" | "cancelled") => {
      await update({ state, resume: undefined, error: undefined });
      await cleanup(row);
    };
    try {
      if (row.state === "failed") await advance(row.resume ?? "staged");
      const target = await options.resolve(row.target);
      if (target.id !== row.target.provider)
        throw Error("transferAccountChanged");
      const from = row.source;
      async function sourceProvider(endpoint: TransferEndpoint) {
        const provider = await options.resolve(endpoint);
        if (provider.id !== endpoint.provider)
          throw Error("transferAccountChanged");
        return provider;
      }
      const targetEntry = () =>
        transferTargetEntry(target, row.target.ref, row.name, signal);

      if (row.state === "staged" || row.state === "reading") {
        signal.throwIfAborted();
        limit(row.target, row.size, target);
        await target.preflightTransfer?.(
          row.target.ref,
          row.name,
          row.size,
          ctx(row.target),
        );
        const quota = await target.quota();
        if (quota && row.size > quota.total - quota.used)
          throw new ProviderError("QUOTA");
        if (!checkedVersion(await targetEntry(), row.replace))
          throw Error("transferConflict");
        await advance("reading");
        let bytes: Blob;
        if ("endpoint" in from) {
          const source = await sourceProvider(from.endpoint);
          const current = await stat(source, from.entry.ref);
          if (!checkedVersion(current, from.entry))
            throw Error("transferSourceChanged");
          bytes = await spool(
            source,
            from.entry.ref,
            sourceKey(row),
            source.id === "github"
              ? (from.entry.version ?? undefined)
              : undefined,
          );
          if (!checkedVersion(await stat(source, from.entry.ref), from.entry))
            throw Error("transferSourceChanged");
          if (
            source.id === "github" &&
            row.size <= 1024 &&
            isLfsPointer(await bytes.text())
          )
            throw Error("folderLfsPointer");
        } else {
          bytes = await storage.get(sourceKey(row));
        }
        if (bytes.size !== row.size) throw Error("transferSourceChanged");
        const native = target.capabilities.hashKind;
        const kinds: HashKind[] = ["sha256"];
        if (native) kinds.push(native);
        if (target.id === "onedrive") kinds.push("sha1");
        const hashes = await hash(bytes, kinds, signal);
        await advance("writing", { hashes, contentType: bytes.type });
      }

      const verify = async (entry: Entry) => {
        if (
          entry.kind !== "file" ||
          !entry.version ||
          (entry.size !== null && entry.size !== row.size)
        )
          return false;
        const kind = entry.hashKind ?? target.capabilities.hashKind;
        const remote = entry.hash;
        if (
          kind &&
          remote &&
          row.hashes?.[kind] &&
          hashPatterns[kind].test(remote)
        )
          return (
            row.hashes[kind] ===
            (kind === "quickxor" ? remote : remote.toLowerCase())
          );
        const key = verificationKey(row);
        try {
          const bytes = await spool(
            target,
            entry.ref,
            key,
            target.id === "github" ? entry.version : undefined,
          );
          return (
            !!row.hashes?.sha256 &&
            (await hash(bytes, ["sha256"], signal)).sha256 === row.hashes.sha256
          );
        } catch (error) {
          if ((error as Error).message === "transferSourceChanged")
            return false;
          throw error;
        } finally {
          await storage.remove(key).catch(() => undefined);
        }
      };

      if (row.state === "writing") {
        signal.throwIfAborted();
        if (
          !row.replace &&
          !row.createId &&
          target.reserveCreate &&
          !row.attempted
        ) {
          await update({ createId: await target.reserveCreate(signal) });
        }
        const candidate = await targetEntry();
        if (
          row.attempted &&
          candidate &&
          !checkedVersion(candidate, row.replace)
        ) {
          if (row.createId && candidate.ref !== "gd:" + row.createId)
            throw Error("transferConflict");
          if (!(await verify(candidate))) {
            if (row.createId)
              await update({ replace: candidate, attempted: false });
            throw Error(mismatch);
          }
          await advance("verified", { saved: candidate, attempted: false });
        } else {
          if (!checkedVersion(candidate, row.replace))
            throw Error("transferConflict");
          const result = await target.push(
            [
              {
                id: row.id,
                op: row.replace ? "modify" : "add",
                ref: row.replace?.ref ?? row.target.ref,
                parent: row.target.ref,
                name: row.name,
                baseVersion: row.replace?.version ?? undefined,
                bytesKey: sourceKey(row),
                size: row.size,
                createId: row.createId,
              },
            ],
            {
              ...ctx(row.target),
              onAttempt: () => update({ attempted: true }),
              onComplete: async (_, entry) => {
                await advance("verifying", { saved: entry, attempted: false });
              },
            },
          );
          if (result.failed) {
            if (!result.failed.error.details.uncertain && !signal.aborted)
              await update({ attempted: false });
            throw result.failed.error;
          }
          if (!result.completed.includes(row.id))
            throw Error("transferWriteUncertain");
        }
      }
      if (row.state === "verifying") {
        signal.throwIfAborted();
        const current = await targetEntry();
        if (!current || (row.saved && !checkedVersion(current, row.saved)))
          throw Error("transferTargetChanged");
        const saved = row.saved ?? current;
        if (!(await verify(saved))) {
          await advance("writing", {
            saved: undefined,
            replace: saved,
            attempted: false,
          });
          throw Error(mismatch);
        }
        if (!checkedVersion(await stat(target, saved.ref), saved))
          throw Error("transferTargetChanged");
        await advance("verified", { saved });
      }
      if (row.state === "verified" || row.state === "deleting") {
        signal.throwIfAborted();
        if (!row.move) {
          await finish("done");
          return;
        }
        if (!("endpoint" in from)) throw Error("transferUnsupportedSource");
        const source = await sourceProvider(from.endpoint);
        const original = await stat(source, from.entry.ref);
        if (!original && row.deleteAttempted) {
          await finish("done");
          return;
        }
        if (!checkedVersion(original, from.entry))
          throw Error("transferSourceChanged");
        if (!checkedVersion(await targetEntry(), row.saved))
          throw Error("transferTargetChanged");
        signal.throwIfAborted();
        await advance("deleting");
        signal.throwIfAborted();
        const result = await source.push(
          [
            {
              id: row.id,
              op: "delete",
              ref: from.entry.ref,
              baseVersion: from.entry.version ?? undefined,
            },
          ],
          {
            ...ctx(from.endpoint),
            onAttempt: async () => {
              await update({ deleteAttempted: true });
              signal.throwIfAborted();
              activity.deleting = true;
            },
          },
        );
        if (result.failed) throw result.failed.error;
        if (!result.completed.includes(row.id))
          throw Error("transferDeleteUncertain");
        await finish("done");
      }
    } catch (error) {
      if (signal.aborted && !activity.deleting) {
        await finish("cancelled");
      } else {
        const resume = row.state === "failed" ? row.resume : row.state;
        const code =
          error instanceof ProviderError
            ? error.userMessage
            : (error as Error).message;
        if (resume !== "done" && resume !== "cancelled")
          await update({
            state: "failed",
            resume,
            error: /^[a-z][a-z0-9_]+$/i.test(code) ? code : "transferFailed",
          });
      }
    }
  }

  return {
    load,
    stage(drafts: { draft: TransferDraft; bytes?: Blob }[]) {
      return lock(async () => {
        const rows = await load();
        const staged: Transfer[] = [];
        for (const { draft, bytes } of drafts) {
          const size = checkDraft(draft);
          if ("local" in draft.source && bytes?.size !== size)
            throw Error("transferSourceChanged");
          if (
            [...rows, ...staged].some(
              (row) =>
                transferPending(row) &&
                row.target.provider === draft.target.provider &&
                row.target.locationId === draft.target.locationId &&
                row.target.ref === draft.target.ref &&
                normalized(row.name) === normalized(draft.name),
            )
          )
            throw Error("transferConflict");
          staged.push({
            ...draft,
            id: crypto.randomUUID(),
            state: "staged",
            size,
            createdAt: Date.now(),
            contentType: bytes?.type,
          });
        }
        try {
          for (const [index, { bytes }] of drafts.entries()) {
            if (bytes) await storage.put(sourceKey(staged[index]), bytes);
          }
          await storage.save([...rows, ...staged]);
        } catch (error) {
          await Promise.all(staged.map(cleanup));
          throw error;
        }
        await storage.requestPersistence().catch(() => undefined);
        return staged;
      });
    },
    run(ids: string[], options: RunOptions) {
      return lock(async () => {
        for (const id of ids) {
          const row = (await load()).find((r) => r.id === id);
          if (!row || !transferPending(row)) continue;
          const activity = {
            controller: new AbortController(),
            deleting: !!row.deleteAttempted,
          };
          active.set(id, activity);
          if (cancellations.has(id) && !activity.deleting)
            activity.controller.abort();
          try {
            await execute(row, options, activity);
          } finally {
            active.delete(id);
          }
        }
      });
    },
    cancel(id: string) {
      cancellations.add(id);
      const activity = active.get(id);
      if (activity && !activity.deleting) activity.controller.abort();
      return lock(async () => {
        const row = (await load()).find((r) => r.id === id);
        if (row && transferPending(row) && !row.deleteAttempted) {
          await save({
            ...row,
            state: "cancelled",
            resume: undefined,
            error: undefined,
          });
          await cleanup(row);
        }
      }).finally(() => cancellations.delete(id));
    },
  };
}
