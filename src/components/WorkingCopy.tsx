import { WorkingOverride } from "./WorkingOverride";
import { WorkingRows } from "./WorkingRows";
import { Button } from "../ui/Button";
import { Modal, Dialog, Heading } from "react-aria-components";
import { useWorkingCopy } from "./useWorkingCopy";
import { staging } from "../services/workingStorage";
import { restoreWorkingFile } from "../services/stageUploads";
import { t } from "../i18n";
import { WorkingConflict } from "./WorkingConflict";
import styles from "./Library.module.css";
export function WorkingCopy() {
  const {
    repoOverride,
    setRepoOverride,
    overrideConfirmed,
    setOverrideConfirmed,
    now,
    installHint,
    rows,
    open,
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
    persisted,
    filter,
    setFilter,
    restore,
    controller,
    run,
    download,
    push,
    groups,
  } = useWorkingCopy();
  return (
    <section id="pending" tabIndex={-1} className={styles.pendingStrip}>
      <span>
        {["add", "modify", "delete", "rename"]
          .map(
            (kind) =>
              t("workingKind" + kind) +
              ": " +
              rows.filter((row) => row.kind === kind).length,
          )
          .join(", ")}{" "}
        {new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 1,
          signDisplay: "always",
        }).format(
          rows.reduce(
            (sum, row) =>
              sum +
              (row.kind === "rename"
                ? 0
                : row.kind === "delete"
                  ? -row.size
                  : row.size - (row.baseSize || 0)),
            0,
          ) / 1048576,
        )}{" "}
        MB
      </span>
      <strong>
        {t("pending")} {rows.length}
      </strong>
      <Button
        onPress={() => {
          setOpen(!open);
          setPublic(false);
        }}
      >
        {t("workingTitle")}
      </Button>
      <Button onPress={() => void download()} isDisabled={!rows.length}>
        {t("workingBackup")}
      </Button>
      <Button onPress={() => restore.current?.click()}>
        {t("workingRestore")}
      </Button>
      <input
        hidden
        ref={restore}
        type="file"
        accept=".zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void run(() => restoreWorkingFile(file));
          e.target.value = "";
        }}
      />
      {rows.length > 0 && (
        <span>
          {t("workingNotice")}{" "}
          {t(persisted ? "workingPersist" : "workingNotPersist")}
          {rows.some((row) => now - row.createdAt > 86400000) &&
            t("workingOld")}
          {installHint && t("workingInstall")}
        </span>
      )}
      {open && (
        <Modal isOpen onOpenChange={setOpen} className={styles.workingPanel}>
          <Dialog>
            <Heading slot="title">{t("workingTitle")}</Heading>
            {error && <p role="alert">{error}</p>}
            <Button onPress={() => void run(staging.undo)}>
              {t("workingUndo")}
            </Button>
            <Button onPress={() => void run(staging.redo)}>
              {t("workingRedo")}
            </Button>
            <label>
              {t("workingFilter")}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["all", "add", "modify", "delete", "rename", "blocked"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(
                        value === "all" ? "workingAll" : "workingKind" + value,
                      )}
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
              <input
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
                  onChange={(e) =>
                    (set as (v: boolean) => void)(e.target.checked)
                  }
                />
                {t(key as string)}
              </label>
            ))}
            <Button
              isDisabled={
                busy || !rows.length || !message.trim() || conflicts.length > 0
              }
              onPress={() => void push()}
            >
              {t("workingPush")}
            </Button>
            {busy && (
              <Button
                isDisabled={ref}
                onPress={() => controller.current?.abort()}
              >
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
              <WorkingConflict
                paths={conflicts}
                onClose={() => setConflicts([])}
              />
            )}
            <Button onPress={() => setOpen(false)}>{t("close")}</Button>
          </Dialog>
        </Modal>
      )}
      {error && !open && <p role="status">{error}</p>}
    </section>
  );
}
