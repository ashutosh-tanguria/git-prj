import type { GitRef } from "../lib/refs";
import { evaluateFile, type Verdict } from "./guards";
export interface Change {
  id: string;
  target: GitRef;
  kind: "add" | "modify" | "delete" | "rename";
  baseVersion?: string;
  blobSha?: string;
  treeDelete?: boolean;
  fileMode?: string;
  replaceVersion?: string;
  folderBase?: { path: string; sha: string };
  replaceTree?: { path: string; sha?: string };
  groupLabel?: string;
  oldPath?: string;
  blobKey?: string;
  size: number;
  baseSize?: number;
  createdAt: number;
  groupId?: string;
  verdict: Verdict;
}
export interface WorkingStorage {
  load: () => Promise<Change[]>;
  save: (changes: Change[]) => Promise<void>;
  put: (key: string, blob: Blob) => Promise<void>;
  get: (key: string) => Promise<Blob>;
}
export function createStaging(storage: WorkingStorage) {
  let rows: Change[] = [],
    redo: Change[][] = [],
    tail = Promise.resolve();
  const undo: Change[][] = [];
  let initialized = false;
  const initialize = async () => {
    if (!initialized) {
      rows = await storage.load();
      initialized = true;
    }
  };
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((fn) => fn());
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn);
    tail = next.then(
      () => {},
      () => {},
    );
    return next;
  };
  const replace = async (next: Change[], history = true) => {
    await storage.save(next);
    if (history) {
      undo.push(rows);
      redo = [];
    }
    rows = next;
    publish();
  };
  return {
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    snapshot: () => rows,
    load: () =>
      serial(async () => {
        rows = await storage.load();
        initialized = true;
        publish();
      }),
    stage: (
      changes: (Omit<Change, "blobKey"> & {
        blob?: Blob;
        loadBlob?: () => Promise<Blob>;
      })[],
      replaceIds: string[] = [],
      validate?: (next: Change[]) => void,
    ) =>
      serial(async () => {
        await initialize();
        const next: Change[] = [];
        for (const { blob: existingBlob, loadBlob, ...change } of changes) {
          const blob = existingBlob || (await loadBlob?.());
          if (blob && evaluateFile(blob.size).level === "block")
            throw Error("guardFileBlock");
          if (blob) {
            await storage.put(change.id, blob);
            next.push({ ...change, blobKey: change.id, size: blob.size });
          } else next.push(change);
        }
        const combined = [
          ...rows.filter((c) => !replaceIds.includes(c.id)),
          ...next,
        ];
        validate?.(combined);
        await replace(combined);
      }),
    discard: (ids: string[]) =>
      serial(() => replace(rows.filter((row) => !ids.includes(row.id)))),
    undo: () =>
      serial(async () => {
        const previous = undo.at(-1);
        if (previous) {
          await storage.save(previous);
          undo.pop();
          redo.push(rows);
          rows = previous;
          publish();
        }
      }),
    redo: () =>
      serial(async () => {
        const next = redo.at(-1);
        if (next) {
          await storage.save(next);
          redo.pop();
          undo.push(rows);
          rows = next;
          publish();
        }
      }),
    update: (transform: (current: Change[]) => Change[]) =>
      serial(async () => {
        await initialize();
        await replace(transform(rows));
      }),
    restore: (next: Change[]) => serial(() => replace(next)),
    read: (row: Change) => storage.get(row.blobKey || row.id),
  };
}
