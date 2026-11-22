import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Heading, Modal } from "react-aria-components";
import { useTransferAccess, type TransferAccess } from "./useTransferAccess";
import { Button } from "../ui/Button";
import { ProviderMark } from "../ui/ProviderMark";
import { t } from "../i18n";
import { itemKey, type LibraryItem } from "../services/organizer";
import { parseRef } from "../lib/refs";
import {
  duplicateCandidates,
  duplicateDeleteSelection,
  hashReference,
  scanDuplicates,
  type DuplicateGroup,
} from "../services/duplicates";
import {
  checkDuplicateVersions,
  duplicateDeleteBatches,
  gitDuplicateJob,
  stageCloudDuplicates,
} from "../services/duplicateDeletes";
import { planSelectionZip, writeSelectionZip } from "../services/selectionZip";
import { OperationReview } from "./OperationReview";
import { evaluateName } from "../services/guards";
import "../i18n/libraryTools";
import styles from "./Library.module.css";
import toolStyles from "./LibraryTools.module.css";

export type LibraryTool =
  | { kind: "duplicateFinder"; items: LibraryItem[] }
  | { kind: "exportSelection"; items: LibraryItem[]; name?: string };
type Progress = { done: number; total: number };
export function ToolProgress({
  label,
  progress,
}: {
  label: string;
  progress?: Progress;
}) {
  return (
    <div className={toolStyles.progress}>
      <span role="status">{label}</span>
      <progress
        aria-label={label}
        value={progress?.done}
        max={Math.max(1, progress?.total ?? 1)}
      />
    </div>
  );
}
export function DuplicateResults({
  groups,
  selected,
  onChange,
}: {
  groups: DuplicateGroup[];
  selected: Set<string>;
  onChange(keys: Set<string>): void;
}) {
  return (
    <div className={toolStyles.groups}>
      {groups.map(({ digest, items }) => (
        <fieldset key={digest}>
          <legend>{t("duplicateCopies", { count: items.length })}</legend>
          {items.map((item) => {
            const { entry, endpoint } = item;
            const id = itemKey(item);
            const path =
              endpoint.provider === "github"
                ? parseRef(endpoint.ref).path
                : entry.name;
            const keeper =
              items.filter(
                (other) => other.entry.version && !selected.has(itemKey(other)),
              ).length <= 1;
            const checked = selected.has(id);
            return (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!entry.version || (!checked && keeper)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (checked) next.delete(id);
                    else next.add(id);
                    onChange(next);
                  }}
                />
                <ProviderMark
                  provider={endpoint.provider}
                  label={t(endpoint.provider)}
                />
                <span title={endpoint.ref}>
                  {endpoint.provider === "github"
                    ? endpoint.locationId.split(":").at(-1) + "/"
                    : ""}
                  {path}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

export default function LibraryTools({
  tool,
  access,
  onClose,
}: {
  tool: LibraryTool;
  access: TransferAccess;
  onClose(): void;
}) {
  const { resolve } = useTransferAccess(access);
  const current = useRef({ resolve, access, tool });
  current.current = { resolve, access, tool };
  const [progress, setProgress] = useState<Progress>();
  const [running, setRunning] = useState(true);
  const [failure, setFailure] = useState("");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [selected, setSelected] = useState(new Set<string>());
  const [batches, setBatches] = useState<LibraryItem[][]>([]);
  const [staged, setStaged] = useState(0);
  const [saving, setSaving] = useState(false);
  const work = useRef<AbortController | null>(null);
  const fileName = (name: string) =>
    name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  useEffect(() => {
    const task = new AbortController();
    work.current = task;
    const { tool, resolve, access } = current.current;
    const update = (done: number, total: number) => {
      if (!task.signal.aborted) setProgress({ done, total });
    };
    async function run() {
      if (tool.kind === "exportSelection") {
        const plan = await planSelectionZip(tool.items, resolve, task.signal);
        const archive = await writeSelectionZip(
          plan,
          resolve,
          task.signal,
          update,
        );
        task.signal.throwIfAborted();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(archive);
        const url = link.href;
        link.download = fileName(tool.name || "Shelf") + ".zip";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        return;
      }
      const items = await duplicateCandidates(
        access.account,
        access.cloud?.locations.roots ?? [],
        tool.items,
      );
      const result = await scanDuplicates(
        items,
        (item) => hashReference(item, resolve, task.signal),
        task.signal,
        update,
      );
      if (!task.signal.aborted) {
        setGroups(result.groups);
        setSkipped(result.skipped);
      }
    }
    void run()
      .catch((error: unknown) => {
        if (!task.signal.aborted)
          setFailure(error instanceof Error ? error.message : "zipFailed");
      })
      .finally(() => {
        if (!task.signal.aborted) setRunning(false);
      });
    return () => task.abort();
  }, []);
  const close = () => {
    if (saving) return;
    work.current?.abort();
    onClose();
  };
  const batch = batches[0];
  const job = useMemo(
    () =>
      batch?.[0].endpoint.provider === "github"
        ? gitDuplicateJob(batch)
        : undefined,
    [batch],
  );
  function stagedBatch() {
    setStaged((count) => count + batch.length);
    const removed = new Set(batch.map(itemKey));
    setSelected((old) => new Set([...old].filter((id) => !removed.has(id))));
    setGroups((old) =>
      old
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !removed.has(itemKey(item))),
        }))
        .filter((group) => group.items.length > 1),
    );
    setBatches((old) => old.slice(1));
  }
  async function prepare() {
    setSaving(true);
    setFailure("");
    try {
      const queued = duplicateDeleteBatches(groups, selected);
      await checkDuplicateVersions(groups, selected, current.current.resolve);
      setBatches(queued);
    } catch (error) {
      setFailure((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function stageCloud() {
    setSaving(true);
    setFailure("");
    try {
      await stageCloudDuplicates(batch, access.cloud?.locations.roots ?? []);
      stagedBatch();
    } catch (error) {
      setFailure((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const title = t(tool.kind);
  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) close();
      }}
      className={styles.workingPanel + " " + styles.formPanel}
    >
      <Dialog>
        <Heading slot="title">{title}</Heading>
        {failure && (
          <p role="alert">
            {t(failure) === failure
              ? t(
                  tool.kind === "exportSelection"
                    ? "zipFailed"
                    : "duplicateFailed",
                )
              : t(failure)}
          </p>
        )}
        {running && (
          <ToolProgress
            progress={progress}
            label={t(
              tool.kind === "exportSelection"
                ? progress
                  ? "zipWriting"
                  : "zipPreparing"
                : "duplicateScanning",
            )}
          />
        )}
        {tool.kind === "exportSelection" && !running && !failure && (
          <p role="status">{t("zipComplete")}</p>
        )}
        {tool.kind === "duplicateFinder" && !running && (
          <>
            {staged > 0 && (
              <p role="status">{t("duplicateStaged", { count: staged })}</p>
            )}
            {batch ? (
              <>
                <p>
                  {t("duplicateReview", { count: batch.length })}{" "}
                  {t(batch[0].endpoint.provider)}
                </p>
                {job ? (
                  <OperationReview
                    job={job}
                    onStaged={stagedBatch}
                    onClose={() => setBatches([])}
                  />
                ) : (
                  <>
                    <ul>
                      {batch.map((item) => (
                        <li key={itemKey(item)}>
                          {item.entry.name}
                          {evaluateName(item.entry.name, "unknown").level ===
                            "warn" && <p>{t("cloudSensitive")}</p>}
                        </li>
                      ))}
                    </ul>
                    <Button
                      isDisabled={saving}
                      onPress={() => void stageCloud()}
                    >
                      {t("duplicateStageCloud")}
                    </Button>
                  </>
                )}
                <Button isDisabled={saving} onPress={() => setBatches([])}>
                  {t("back")}
                </Button>
              </>
            ) : (
              <>
                {skipped > 0 && (
                  <p role="status">
                    {t("duplicateSkipped", { count: skipped })}
                  </p>
                )}
                {groups.length ? (
                  <>
                    <Button
                      onPress={() =>
                        setSelected(duplicateDeleteSelection(groups))
                      }
                    >
                      {t("duplicateSelect")}
                    </Button>
                    <DuplicateResults
                      groups={groups}
                      selected={selected}
                      onChange={setSelected}
                    />
                    <Button
                      isDisabled={!selected.size || saving || !navigator.onLine}
                      onPress={() => void prepare()}
                    >
                      {t("duplicateStage")}
                    </Button>
                  </>
                ) : (
                  !failure && <p role="status">{t("duplicateEmpty")}</p>
                )}
              </>
            )}
          </>
        )}
        <Button isDisabled={saving} onPress={close}>
          {t(running ? "cancel" : "close")}
        </Button>
      </Dialog>
    </Modal>
  );
}
