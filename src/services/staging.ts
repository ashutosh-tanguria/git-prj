import type { GitRef } from "../lib/refs";
import { evaluateFile, type Verdict } from "./guards";
export interface Change {
  id: string;
  target: GitRef;
  kind: "add" | "modify" | "delete" | "rename";
  baseVersion?: string;
  oldPath?: string;
  blobKey?: string;
  size: number;
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
        publish();
      }),
    stage: (changes: (Omit<Change, "blobKey"> & { blob?: Blob })[]) =>
      serial(async () => {
        const next: Change[] = [];
        for (const { blob, ...change } of changes) {
          if (blob && evaluateFile(blob.size).level === "block")
            throw Error("guardFileBlock");
          if (blob) {
            await storage.put(change.id, blob);
            next.push({ ...change, blobKey: change.id, size: blob.size });
          } else next.push(change);
        }
        await replace([...rows, ...next]);
        void navigator.storage?.persist?.();
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
    restore: (next: Change[]) => serial(() => replace(next)),
    read: (row: Change) => storage.get(row.blobKey || row.id),
  };
}
