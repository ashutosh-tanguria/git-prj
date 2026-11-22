import { useRef, useState } from "react";
import { Dialog, Heading, Modal } from "react-aria-components";
import { parseRef } from "../lib/refs";
import { t } from "../i18n";
import { evaluateFile, evaluateName, evaluateRepo } from "../services/guards";
import type { Repo } from "../services/library";
import { transferPending } from "../services/transferJournal";
import type { Approvals, Transfer } from "../services/transferTypes";
import { Button } from "../ui/Button";
import { transferLocationName, transferMessage } from "./TransferPicker";
import styles from "./Library.module.css";
import transferStyles from "./Transfer.module.css";

export function TransferRow({
  row,
  bytes,
  children,
}: {
  row: Transfer;
  bytes?: number;
  children?: React.ReactNode;
}) {
  return (
    <li className={transferStyles.row} data-state={row.state}>
      <strong>{row.source.entry.name}</strong>
      <span>
        {t(row.move ? "moveTo" : "copyTo")} {transferLocationName(row.target)} ·{" "}
        {[...(row.folders ?? []), row.name].join("/")}
      </span>
      <span role="status">{t("transferState_" + row.state)}</span>
      {bytes !== undefined && (
        <progress
          aria-label={row.source.entry.name}
          max={Math.max(1, row.size)}
          value={bytes}
        />
      )}
      {row.move && "endpoint" in row.source && (
        <span>{t("transferRecovery_" + row.source.endpoint.provider)}</span>
      )}
      {row.state === "failed" && row.error && (
        <p role="alert">{transferMessage(Error(row.error))}</p>
      )}
      {row.state === "cancelled" && (row.saved || row.attempted) && (
        <p>{t("transferCancelledTarget")}</p>
      )}
      {children}
    </li>
  );
}

type RequiredApproval = {
  id: string;
  repo?: Repo;
  name: boolean;
  warning: boolean;
  override: boolean;
  unknown: boolean;
  bytes: number;
};
function requiredApprovals(
  rows: Transfer[],
  roots: Repo[],
): RequiredApproval[] {
  const endpoints = rows.flatMap((row) => {
    const { source, target } = row;
    const githubSource =
      row.move && "endpoint" in source && source.endpoint.provider === "github"
        ? source.endpoint
        : undefined;
    return [
      ...(target.provider === "github" &&
      !["verified", "deleting"].includes(row.resume ?? row.state)
        ? [
            {
              endpoint: target,
              size: row.size,
              name: [parseRef(target.ref).path, row.name].join("/"),
            },
          ]
        : []),
      ...(githubSource
        ? [
            {
              endpoint: githubSource,
              size: 0,
              name: parseRef(githubSource.ref).path,
            },
          ]
        : []),
    ];
  });
  const result = new Map<string, RequiredApproval>();
  for (const { endpoint, size, name } of endpoints) {
    const { owner, repo: repository } = parseRef(endpoint.ref);
    const repo = roots.find(
      (item) => item.full_name === owner + "/" + repository,
    );
    const previous = result.get(endpoint.locationId);
    const bytes = (previous?.bytes ?? 0) + size;
    const projected = evaluateRepo(repo?.size ?? null, bytes);
    result.set(endpoint.locationId, {
      id: endpoint.locationId,
      repo,
      name:
        !!previous?.name ||
        evaluateName(name, repo?.private ? "private" : "public").level ===
          "warn",
      warning:
        !!previous?.warning ||
        evaluateFile(size).level === "warn" ||
        projected.level === "warn",
      override: !!previous?.override || projected.code === "guardRepoBlock",
      unknown: !!previous?.unknown || repo?.size == null,
      bytes,
    });
  }
  return [...result.values()];
}
export function TransferReview({
  rows,
  roots,
  progress,
  running,
  onRun,
  onCancel,
  onClose,
  onBackup,
  onRestore,
  backupBusy,
  error,
}: {
  rows: Transfer[];
  roots: Repo[];
  progress: Record<string, number>;
  running?: string;
  onRun(ids: string[], approvals: Record<string, Approvals>): void;
  onCancel(id: string): void;
  onClose(): void;
  onBackup(): void;
  onRestore(file: File): void;
  backupBusy: boolean;
  error?: string;
}) {
  const restore = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [approvals, setApprovals] = useState<Record<string, Approvals>>({});
  const [overrideChecked, setOverrideChecked] = useState<
    Record<string, boolean>
  >({});
  const queue = rows.filter(
    (row) => transferPending(row) && row.state !== "failed",
  );
  const active = rows.filter(
    (row) => selected.includes(row.id) && transferPending(row),
  );
  const required = requiredApprovals(active, roots);
  const choose = (ids: string[]) => {
    setApprovals({});
    setOverrideChecked({});
    setSelected(ids);
  };
  const update = (id: string, value: Approvals) =>
    setApprovals((old) => ({ ...old, [id]: { ...old[id], ...value } }));
  const ready = required.every((item) => {
    const approval = approvals[item.id];
    return (
      !item.unknown &&
      (item.repo?.private || approval?.publicConfirmed) &&
      (!item.warning || approval?.warningsConfirmed) &&
      (!item.name || approval?.sensitiveConfirmed) &&
      (!item.override ||
        (overrideChecked[item.id] && approval?.repoOverride?.trim()))
    );
  });
  return (
    <Modal
      isOpen
      className={styles.workingPanel}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog>
        <Heading slot="title">{t("transferReview")}</Heading>
        <div className={transferStyles.actions}>
          <Button
            isDisabled={backupBusy || !!running || !rows.some(transferPending)}
            onPress={onBackup}
          >
            {t("transferBackup")}
          </Button>
          <Button
            isDisabled={backupBusy || !!running}
            onPress={() => restore.current?.click()}
          >
            {t("transferRestore")}
          </Button>
          <input
            ref={restore}
            hidden
            type="file"
            accept=".zip"
            aria-label={t("transferRestore")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onRestore(file);
              event.target.value = "";
            }}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        {queue.length > 1 && (
          <Button
            isDisabled={!!running}
            onPress={() => choose(queue.map((row) => row.id))}
          >
            {t("transferPushAll")}
          </Button>
        )}
        <ul className={transferStyles.rows}>
          {rows.map((row) => (
            <TransferRow
              key={row.id}
              row={row}
              bytes={running === row.id ? progress[row.id] : undefined}
            >
              {transferPending(row) && (
                <div className={transferStyles.actions}>
                  <Button
                    isDisabled={!!running}
                    onPress={() => choose([row.id])}
                  >
                    {t(
                      row.state === "failed"
                        ? "transferRetry"
                        : row.state === "staged"
                          ? "workingPush"
                          : "transferResume",
                    )}
                  </Button>
                  {!row.deleteAttempted && (
                    <Button
                      onPress={() => {
                        if (selected.includes(row.id)) choose([]);
                        onCancel(row.id);
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  )}
                </div>
              )}
            </TransferRow>
          ))}
        </ul>
        {active.length > 0 && (
          <section>
            {required
              .filter(
                (item) =>
                  !item.repo?.private ||
                  item.name ||
                  item.warning ||
                  item.override ||
                  item.unknown,
              )
              .map((item) => (
                <fieldset key={item.id}>
                  <legend>{item.repo?.full_name ?? t("github")}</legend>
                  {item.unknown && <p role="alert">{t("guardRepoUnknown")}</p>}
                  {item.repo?.private === false && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!approvals[item.id]?.publicConfirmed}
                        onChange={(event) =>
                          update(item.id, {
                            publicConfirmed: event.target.checked,
                          })
                        }
                      />
                      {t("publicConfirm")}
                    </label>
                  )}
                  {item.warning && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!approvals[item.id]?.warningsConfirmed}
                        onChange={(event) =>
                          update(item.id, {
                            warningsConfirmed: event.target.checked,
                          })
                        }
                      />
                      {t("transferSizeConfirm")}
                    </label>
                  )}
                  {item.name && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!approvals[item.id]?.sensitiveConfirmed}
                        onChange={(event) =>
                          update(item.id, {
                            sensitiveConfirmed: event.target.checked,
                          })
                        }
                      />
                      {t("sensitiveConfirm")}
                    </label>
                  )}
                  {item.override && (
                    <>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!overrideChecked[item.id]}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setOverrideChecked((old) => ({
                              ...old,
                              [item.id]: checked,
                            }));
                          }}
                        />
                        {t("repoOverride")}
                      </label>
                      <label>
                        {t("explanation")}
                        <textarea
                          value={approvals[item.id]?.repoOverride ?? ""}
                          onChange={(event) =>
                            update(item.id, {
                              repoOverride: event.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </fieldset>
              ))}
            <Button
              isDisabled={!ready || !!running || backupBusy}
              onPress={() => {
                onRun(
                  active.map((row) => row.id),
                  approvals,
                );
                choose([]);
              }}
            >
              {t("transferStart")}
            </Button>
          </section>
        )}
        <Button onPress={onClose}>{t("close")}</Button>
      </Dialog>
    </Modal>
  );
}
