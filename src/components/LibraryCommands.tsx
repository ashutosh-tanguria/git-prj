import { HomeUpload } from "./HomeUpload";
import "../i18n/m3b";
import { useEffect, useRef, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { CreateRepository } from "./CreateRepository";
import { ShortcutSettings } from "./ShortcutSettings";
import { GuardReview } from "./GuardReview";
import { staging } from "../services/workingStorage";
import { setFileClipboard, planPaste } from "../services/clipboard";
import { defaultShortcuts } from "../services/shortcuts";
import { useCommandRegistry } from "./useCommandRegistry";
import { preference } from "../services/preferences";
import { prepareFileCommand } from "../services/fileCommands";
import type { Change } from "../services/staging";
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
  onRefresh,
}: {
  current: GitRef | null;
  selection: Entry[];
  roots: Repo[];
  onCreated: (repo: Repo, branchWarning?: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  const previous = useRef(current);
  if (current) previous.current = current;
  const [action, setAction] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [plan, setPlan] = useState<(Change & { blob?: Blob })[]>(),
    [bindings, setBindings] = useState(defaultShortcuts);
  useEffect(() => {
    void preference("shortcuts", defaultShortcuts).then(setBindings);
  }, []);
  const dispatch = async (action: string) => {
    setError("");
    setName("");
    setPlan(undefined);
    if (action === "push") {
      window.dispatchEvent(new Event("working-review"));
      return;
    }
    if (action === "uploadFiles" && !current) {
      setAction("uploadFiles");
      return;
    }
    if (action === "uploadFiles") {
      window.dispatchEvent(new Event("shelf-upload"));
      return;
    }
    if (action === "cut" || action === "copy") {
      setFileClipboard(selection, action === "cut");
      return;
    }
    if (action === "rename" && selection.length === 1)
      setName(selection[0].name);
    setAction(action);
    if (action === "settings") location.hash = "#/settings/keyboard";
    if (action === "paste" && current) {
      try {
        setPlan(await planPaste(current));
      } catch (e) {
        setError(
          [
            "clipboardEmpty",
            "clipboardFilesOnly",
            "clipboardSamePath",
            "clipboardCrossRepository",
            "destinationInvalid",
          ].includes((e as Error).message)
            ? (e as Error).message
            : "commandError",
        );
      }
    }
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
        location.hash = previous.current
          ? "#/gh/" +
            previous.current.owner +
            "/" +
            previous.current.repo +
            "@" +
            encodeURIComponent(previous.current.branch) +
            "/" +
            previous.current.path
          : "#/";
      setAction("");
      setPlan(undefined);
    };
  const prepare = () => {
    if (!current || !repo) {
      setError("commandError");
      return;
    }
    try {
      setPlan(prepareFileCommand(action, current, selection, name));
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
  if (!action) return null;
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
        {action === "uploadFiles" ? (
          <HomeUpload roots={roots} onClose={close} />
        ) : action === "settings" ? (
          <ShortcutSettings
            bindings={bindings}
            onSave={(value) => {
              setBindings(value);
              close();
            }}
          />
        ) : plan && repo ? (
          <GuardReview
            files={plan.map((c) => ({
              name: c.target.path,
              size: c.kind === "delete" || c.kind === "rename" ? 0 : c.size,
            }))}
            repo={repo}
            onStage={async () => {
              await staging.stage(plan);
              close();
            }}
          />
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
