import { WorkingReview } from "./WorkingReview";
import { QuickPush } from "./QuickPush";
import { Button } from "../ui/Button";
import { useWorkingCopy } from "./useWorkingCopy";
import { restoreWorkingFile } from "../services/stageUploads";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function WorkingCopy() {
  const state = useWorkingCopy();
  const {
    commits,
    quick,
    anchor,
    setQuick,
    now,
    installHint,
    rows,
    open,
    setOpen,
    message,
    setMessage,
    error,
    busy,
    ref,
    controller,
    persisted,
    restore,
    run,
    download,
    push,
    setPublic,
  } = state;
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
      <Button onPress={() => window.dispatchEvent(new Event("working-review"))}>
        {t("workingPush")}
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
      {open &&
        (quick ? (
          <QuickPush
            rows={rows}
            message={message}
            onMessage={setMessage}
            onPush={() => void push()}
            onClose={() => setOpen(false)}
            onChange={() => setQuick(false)}
            busy={busy}
            anchor={anchor}
            finishing={ref}
            onCancel={() => controller.current?.abort()}
          />
        ) : (
          <WorkingReview state={state} />
        ))}
      {commits.map((url) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          {t("viewCommit")}
        </a>
      ))}
      {error && !open && <p role="status">{error}</p>}
    </section>
  );
}
