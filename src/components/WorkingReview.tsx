import { DestinationEditor } from "./DestinationEditor";
import { WorkingOverride } from "./WorkingOverride";
import { WorkingRows } from "./WorkingRows";
import { Button } from "../ui/Button";
import { Modal, Dialog, Heading } from "react-aria-components";
import { useWorkingCopy } from "./useWorkingCopy";
import { staging } from "../services/workingStorage";
import { t } from "../i18n";
import { WorkingConflict } from "./WorkingConflict";
import styles from "./Library.module.css";
export function WorkingReview({
  state,
}: {
  state: ReturnType<typeof useWorkingCopy>;
}) {
  const {
    repoOverride,
    setRepoOverride,
    overrideConfirmed,
    setOverrideConfirmed,
    rows,
    setOpen,
    message,
    setMessage,
    publicConfirm,
    setPublic,
    warnings,
    setWarnings,
    sensitive,
    setSensitive,
    error,
    busy,
    ref,
    conflicts,
    setConflicts,
    filter,
    setFilter,
    controller,
    run,
    push,
    groups,
  } = state;
  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!busy) setOpen(open);
      }}
      className={styles.workingPanel}
    >
      <Dialog>
        <Heading slot="title">{t("workingTitle")}</Heading>
        <div inert={busy}>
          <DestinationEditor
            key={rows[0]?.target.owner + "/" + rows[0]?.target.repo}
            rows={rows}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <Button isDisabled={busy} onPress={() => void run(staging.undo)}>
          {t("workingUndo")}
        </Button>
        <Button isDisabled={busy} onPress={() => void run(staging.redo)}>
          {t("workingRedo")}
        </Button>
        <label>
          {t("workingFilter")}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["all", "add", "modify", "delete", "rename", "blocked"].map(
              (value) => (
                <option key={value} value={value}>
                  {t(value === "all" ? "workingAll" : "workingKind" + value)}
                </option>
              ),
            )}
          </select>
        </label>
        <WorkingRows
          groups={groups}
          busy={busy}
          onDiscard={(ids) => void run(() => staging.discard(ids))}
        />
        <label>
          {t("workingMessage")}
          <textarea
            disabled={busy}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {[
          [publicConfirm, setPublic, "publicConfirm"],
          [warnings, setWarnings, "workingConsent"],
          [sensitive, setSensitive, "workingSensitive"],
        ].map(([checked, set, key], i) => (
          <label key={i}>
            <input
              type="checkbox"
              checked={checked as boolean}
              onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
            />
            {t(key as string)}
          </label>
        ))}
        <Button
          isDisabled={
            busy ||
            !rows.length ||
            !message.trim() ||
            conflicts.length > 0 ||
            rows.some((c) => c.verdict.level === "block")
          }
          onPress={() => void push()}
        >
          {t("workingPush")}
        </Button>
        {busy && (
          <Button isDisabled={ref} onPress={() => controller.current?.abort()}>
            {t(ref ? "workingRef" : "workingCancel")}
          </Button>
        )}
        <WorkingOverride
          value={repoOverride}
          onValue={setRepoOverride}
          checked={overrideConfirmed}
          onChecked={setOverrideConfirmed}
        />
        {!!conflicts.length && (
          <WorkingConflict paths={conflicts} onClose={() => setConflicts([])} />
        )}
        <Button isDisabled={busy} onPress={() => setOpen(false)}>
          {t("close")}
        </Button>
      </Dialog>
    </Modal>
  );
}
