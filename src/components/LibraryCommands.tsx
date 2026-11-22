import { HomeUpload } from "./HomeUpload";
import "../i18n/m3b";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { CreateRepository } from "./CreateRepository";
import { ShortcutSettings } from "./ShortcutSettings";
import { OperationReview, type OperationJob } from "./OperationReview";
import "../i18n/m3c";
import { selectionJob } from "../services/selectionJob";
import { setFileClipboard, clipboardJob } from "../services/clipboard";
import { defaultShortcuts } from "../services/shortcuts";
import { useCommandRegistry } from "./useCommandRegistry";
import { preference } from "../services/preferences";
import type { Repo, Entry } from "../services/library";
import type { GitRef } from "../lib/refs";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function LibraryCommands({
  current,
  selection,
  roots,
  onCreated,
  cloudCommand,
  providerSettings,
  onRefresh,
}: {
  current: GitRef | null;
  selection: Entry[];
  roots: Repo[];
  cloudCommand?(action: string): boolean;
  providerSettings?: ReactNode;
  onCreated: (repo: Repo, branchWarning?: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  const previousRoute = useRef("");
  const previous = useRef(current);
  if (current) previous.current = current;
  const [action, setAction] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [job, setJob] = useState<OperationJob>(),
    [notice, setNotice] = useState(""),
    [bindings, setBindings] = useState(defaultShortcuts);
  useEffect(() => {
    void preference("shortcuts", defaultShortcuts).then((saved) =>
      setBindings({ ...defaultShortcuts, ...saved }),
    );
  }, []);
  const dispatch = async (action: string) => {
    if (action === "previewSite" || cloudCommand?.(action)) return;
    setError("");
    setName("");
    setJob(undefined);
    if (action === "push") {
      window.dispatchEvent(new Event("working-review"));
      return;
    }
    if (action === "uploadFiles" && !current) {
      setAction("uploadFiles");
      return;
    }
    if (action === "uploadFolder" && current) {
      window.dispatchEvent(new Event("shelf-upload-folder"));
      return;
    }
    if (action === "uploadFiles") {
      window.dispatchEvent(new Event("shelf-upload"));
      return;
    }
    if (action === "cut" || action === "copy") {
      setFileClipboard(selection, action === "cut");
      setNotice(action === "cut" ? t("folderCutNote") : "");
      return;
    }
    if (action === "rename" && selection.length === 1)
      setName(selection[0].name);
    setAction(action);
    if (action === "settings") {
      previousRoute.current = location.hash;
      location.hash = "#/settings/keyboard";
    }
    if (action === "paste" && current) setJob(() => clipboardJob(current));
  };
  useCommandRegistry(bindings, dispatch);
  useEffect(() => {
    const route = () => {
      if (location.hash === "#/settings/keyboard") setAction("settings");
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  const repo = roots.find(
      (r) => r.full_name === current?.owner + "/" + current?.repo,
    ),
    close = () => {
      if (action === "settings" && location.hash === "#/settings/keyboard")
        location.hash =
          previousRoute.current ||
          (previous.current
            ? "#/gh/" +
              previous.current.owner +
              "/" +
              previous.current.repo +
              "@" +
              encodeURIComponent(previous.current.branch) +
              "/" +
              previous.current.path
            : "#/");
      setAction("");
      setJob(undefined);
    };
  const prepare = () => {
    if (!current || !repo) {
      setError("commandError");
      return;
    }
    try {
      setJob(() => selectionJob(action, current, selection, name));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (action === "newRepository")
    return (
      <CreateRepository
        onCreated={onCreated}
        onClose={close}
        onRefresh={onRefresh}
      />
    );
  if (!action) return notice ? <p role="status">{notice}</p> : null;
  return (
    <Modal
      isOpen
      className={styles.workingPanel + " " + styles.formPanel}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog>
        <Heading slot="title">
          {t(action === "settings" ? "commandSettings" : action)}
        </Heading>
        {action === "uploadFiles" || action === "uploadFolder" ? (
          <HomeUpload
            roots={roots}
            onClose={close}
            directory={action === "uploadFolder"}
          />
        ) : action === "settings" ? (
          <>
            {providerSettings}
            <ShortcutSettings
              bindings={bindings}
              onSave={(value) => {
                setBindings(value);
                close();
              }}
            />
          </>
        ) : job ? (
          <OperationReview job={job} onClose={close} />
        ) : action !== "paste" ? (
          <>
            {action !== "delete" && (
              <label>
                {t("commandName")}
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
            {action === "delete" && <p>{t("commandDelete")}</p>}
            {action === "newFolder" && <p>{t("commandNewFolder")}</p>}
            <Button onPress={prepare}>{t("commandPreview")}</Button>
          </>
        ) : null}
        {error && <p role="alert">{t(error)}</p>}
        <Button onPress={close}>{t("workingCancel")}</Button>
      </Dialog>
    </Modal>
  );
}
