import {
  ProviderError,
  type Change,
  type Location,
  type PushContext,
  type StorageProvider,
} from "../providers/types";
import { cloudStorage } from "./workingStorage";

export interface CloudChange extends Change {
  locationId: string;
  label: string;
  attempted?: boolean;
}
export interface CloudWorkingStorage {
  load(): Promise<CloudChange[] | undefined>;
  save(rows: CloudChange[]): Promise<void>;
  put(key: string, blob: Blob): Promise<void>;
  get(key: string): Promise<Blob>;
  remove?(key: string): Promise<void>;
}
export function createCloudStaging(
  storage: CloudWorkingStorage,
  lock: <T>(action: () => Promise<T>) => Promise<T>,
) {
  const load = async () => (await storage.load()) ?? [];
  return {
    load,
    stage: (
      location: Location,
      changes: { change: CloudChange; bytes?: Blob }[],
    ) =>
      lock(async () => {
        const rows = await load();
        const next = [...rows];
        for (const { change, bytes } of changes) {
          const duplicate = next.some(
            (row) =>
              row.locationId === location.id &&
              ((row.baseVersion &&
                change.baseVersion &&
                row.ref === change.ref) ||
                (row.parent === change.parent &&
                  row.name &&
                  row.name.normalize("NFC").toLowerCase() ===
                    change.name?.normalize("NFC").toLowerCase())),
          );
          if (duplicate) throw new ProviderError("CONFLICT");
          if (bytes) {
            await storage.put(change.id, bytes);
            next.push({ ...change, bytesKey: change.id, size: bytes.size });
          } else next.push(change);
        }
        await storage.save(next);
        return next;
      }),
    discard: (id: string) =>
      lock(async () => {
        const rows = await load();
        const next = rows.filter((row) => row.id !== id);
        await storage.save(next);
        return next;
      }),
    push: (
      provider: StorageProvider,
      location: Location,
      ctx: Pick<PushContext, "signal" | "onProgress">,
    ) =>
      lock(async () => {
        let rows = await load();
        const save = async (next: CloudChange[]) => {
          await storage.save(next);
          rows = next;
        };
        const queue = rows.filter((row) => row.locationId === location.id);
        const uncertain = queue.find((row) => row.attempted);
        if (uncertain) {
          // Refresh the destination state without replaying a mutation whose response was lost.
          if (uncertain.baseVersion)
            await provider.stat(uncertain.ref).catch(() => undefined);
          else
            await provider
              .list(uncertain.parent ?? uncertain.ref)
              .catch(() => undefined);
          return {
            completed: [],
            failed: {
              id: uncertain.id,
              error: new ProviderError("CONFLICT", false, { uncertain: true }),
            },
          };
        }
        const result = await provider.push(queue, {
          ...ctx,
          readBytes: storage.get,
          onAttempt: (id) =>
            save(
              rows.map((row) =>
                row.id === id ? { ...row, attempted: true } : row,
              ),
            ),
          onComplete: async (id) => {
            const key = rows.find((row) => row.id === id)?.bytesKey;
            await save(rows.filter((row) => row.id !== id));
            if (key) await storage.remove?.(key).catch(() => undefined);
          },
        });
        if (result.failed && !result.failed.error.details.uncertain) {
          await save(
            rows.map((row) =>
              row.id === result.failed?.id ? { ...row, attempted: false } : row,
            ),
          );
        }
        return result;
      }),
  };
}

export const cloudStaging = createCloudStaging(
  { ...cloudStorage, load: () => cloudStorage.load<CloudChange[]>() },
  (action) => navigator.locks.request("shelf-cloud-staging", action),
);
