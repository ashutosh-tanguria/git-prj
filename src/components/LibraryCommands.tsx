import { CommandPalette } from "./CommandPalette";
import type { NamedEntry } from "../services/filenameSearch";
import type { TextMatch } from "../services/textSearch";
import { StorageSettings } from "./StorageSettings";
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
import { preference, savePreference } from "../services/preferences";
import type { Repo, Entry } from "../services/library";
import type { GitRef } from "../lib/refs";
import { parseRef, refString } from "../lib/refs";
import { sameLocation } from "../services/folderTypes";
import {
  githubEndpoint,
  githubTransferSource,
  requestTransfer,
  transferClipboardGet,
  transferClipboardSet,
} from "../services/transferRequests";
import type { CloudLibrary } from "./cloudTypes";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
import type { Label } from "../services/organizer";
export function LibraryCommands({
  current,
  selection,
  roots,
  onCreated,
  cloudCommand,
  cloud,
  account,
  providerSettings,
  onRefresh,
  onTextResult,
  onFilenameResult,
  tags,
  onTag,
}: {
  current: GitRef | null;
  selection: Entry[];
  roots: Repo[];
  cloudCommand?(action: string): boolean;
  cloud?: CloudLibrary;
  account?: string;
  providerSettings?: ReactNode;
  onCreated: (repo: Repo, branchWarning?: boolean) => void;
  onRefresh: () => Promise<void>;
  onTextResult: (item: TextMatch) => void;
  onFilenameResult: (item: NamedEntry) => void;
  tags?: Label[];
  onTag?: (id: string) => void;
}) {
  const previousRoute = useRef("");
  const previous = useRef(current);
  if (current) previous.current = current;
  const [action, setAction] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [job, setJob] = useState<OperationJob>(),
    [notice, setNotice] = useState(""),
    [palette, setPalette] = useState(false),
    [discarding, setDiscarding] = useState(false),
    [bindings, setBindings] = useState(defaultShortcuts);
  useEffect(() => {
    void preference("shortcuts", defaultShortcuts).then((saved) =>
      setBindings({ ...defaultShortcuts, ...saved }),
    );
    for (const setting of ["theme", "density"] as const)
      void preference(setting, "").then((value) => {
        if (value) document.documentElement.dataset[setting] = value;
      });
  }, []);
  const dispatch = async (action: string) => {
    switch (action) {
      case "commandPalette":
        setPalette(true);
        return;
      case "folderSearch":
        window.dispatchEvent(new Event("shelf-folder-search"));
        return;
      case "goLocation":
        window.dispatchEvent(new Event("shelf-address-edit"));
        return;
      case "switchView":
        window.dispatchEvent(
          new CustomEvent("shelf-command", { detail: { action: "splitView" } }),
        );
        return;
      case "sizeLedger":
        if (current && !cloud?.active)
          window.dispatchEvent(new Event("shelf-ledger"));
        return;
      case "reviewPending":
        if (!cloud?.active || !cloud.command(action))
          window.dispatchEvent(new Event("shelf-review-pending"));
        return;
      case "discardPending":
      case "connectProvider":
        setError("");
        setAction(action);
        return;
      case "splitPdf":
        if (
          current &&
          !cloud?.active &&
          selection.length === 1 &&
          selection[0].kind === "file" &&
          /\.pdf$/i.test(selection[0].name)
        )
          window.dispatchEvent(
            new CustomEvent("shelf-split-pdf", { detail: selection[0] }),
          );
        return;
      case "toggleTheme": {
        const node = document.documentElement;
        const dark = node.dataset.theme
          ? node.dataset.theme === "dark"
          : matchMedia("(prefers-color-scheme: dark)").matches;
        node.dataset.theme = dark ? "light" : "dark";
        await savePreference("theme", node.dataset.theme);
        return;
      }
      case "toggleDensity": {
        const node = document.documentElement;
        node.dataset.density =
          node.dataset.density === "default" || !node.dataset.density
            ? "compact"
            : node.dataset.density === "compact"
              ? "comfortable"
              : "default";
        await savePreference("density", node.dataset.density);
        return;
      }
      case "exportSelection":
        return;
    }
    if (action === "push" && !navigator.onLine) {
      setNotice(t("pushOffline"));
      return;
    }
    if (["splitView", "localImport", "localExport"].includes(action)) return;
    const cloudDestination = cloud?.transferDestination;
    const gitDestination =
      current && account && githubEndpoint(account, current);
    const destination = cloudDestination || gitDestination;
    const sources = cloud?.active
      ? cloud.transferSelection
      : account
        ? selection.map((entry) => githubTransferSource(account, entry))
        : [];
    if (action === "moveTo" || action === "copyTo") {
      if (!sources.length) setNotice(t("transferSelectFiles"));
      else
        requestTransfer({
          items: sources.map((source) => ({ source })),
          move: action === "moveTo",
        });
      return;
    }
    if (action === "cut" || action === "copy") {
      transferClipboardSet(
        sources.length
          ? {
              items: sources.map((source) => ({ source })),
              move: action === "cut",
            }
          : undefined,
      );
      if (cloud?.active) {
        setNotice(sources.length && action === "cut" ? t("folderCutNote") : "");
        return;
      }
    }
    const marked = action === "paste" ? transferClipboardGet() : undefined;
    if (
      marked &&
      destination &&
      (destination.provider !== "github" ||
        !marked.items.every(
          ({ source }) =>
            "endpoint" in source &&
            source.endpoint.provider === "github" &&
            current &&
            source.endpoint.locationId === destination.locationId &&
            sameLocation(parseRef(source.entry.ref), current),
        ))
    ) {
      requestTransfer({ ...marked, target: destination });
      return;
    }
    if (["settings", "storageWipe"].includes(action)) {
      previousRoute.current = location.hash;
      location.hash = "#/settings/keyboard";
      setAction(action);
      return;
    }
    if (action === "keepOffline" && !cloud?.active && account) {
      try {
        const { readGitHub } = await import("../services/githubCache");
        await Promise.all(
          selection
            .filter((entry) => entry.kind === "file")
            .map((entry) =>
              readGitHub(
                account,
                parseRef(entry.ref),
                undefined,
                undefined,
                true,
              ),
            ),
        );
        setNotice(t("keptOffline"));
      } catch {
        setNotice(t("storageFull"));
      }
      return;
    }
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
    if (action === "paste" && current) setJob(() => clipboardJob(current));
  };
  useCommandRegistry(bindings, dispatch);
  useEffect(() => {
    const route = () => {
      if (location.hash === "#/settings/keyboard")
        setAction((value) => (value === "storageWipe" ? value : "settings"));
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  const repo = roots.find(
      (r) => r.full_name === current?.owner + "/" + current?.repo,
    ),
    close = () => {
      if (
        ["settings", "storageWipe"].includes(action) &&
        location.hash === "#/settings/keyboard"
      )
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
  const scopes = [
    ...(account ? ["github:" + account.toLowerCase()] : []),
    ...(cloud?.locations.roots ?? []).map(
      (root) => root.provider + ":" + root.id,
    ),
  ];
  const rootsForSearch: NamedEntry[] = [
    ...roots.flatMap((root) => {
      if (!account) return [];
      const [owner, repo] = root.full_name.split("/");
      return [
        {
          name: root.full_name,
          path: root.full_name,
          kind: "dir" as const,
          scope: "github:" + account.toLowerCase(),
          ref: refString({
            owner,
            repo,
            branch: root.default_branch,
            path: "",
          }),
        },
      ];
    }),
    ...(cloud?.locations.roots ?? []).map((root) => ({
      name: root.label,
      path: root.label,
      kind: "dir" as const,
      scope: root.provider + ":" + root.id,
      ref: root.root,
    })),
  ];
  const search = (
    <>
      {palette && (
        <CommandPalette
          bindings={bindings}
          roots={rootsForSearch}
          scopes={scopes}
          onClose={() => setPalette(false)}
          onCommand={(command) => void dispatch(command)}
          onOpen={onFilenameResult}
          onTextResult={onTextResult}
          tags={tags}
          onTag={onTag}
          unavailable={(command) => {
            if (command === "exportSelection") return t("paletteZipLater");
            if (command === "push" && !navigator.onLine)
              return t("pushOffline");
            if (command === "sizeLedger" && (!current || cloud?.active))
              return t("paletteGitHubOnly");
            if (
              command === "splitPdf" &&
              (!current ||
                cloud?.active ||
                selection.length !== 1 ||
                !/\.pdf$/i.test(selection[0].name))
            )
              return t("paletteChoosePdf");
            if (
              ["moveTo", "copyTo"].includes(command) &&
              !(cloud?.active
                ? cloud.transferSelection.length
                : selection.length)
            )
              return t("transferSelectFiles");
          }}
        />
      )}
    </>
  );
  async function discardPending() {
    setDiscarding(true);
    try {
      const { staging } = await import("../services/workingStorage");
      const { cloudStaging } = await import("../services/cloudStaging");
      const { transfers } = await import("../services/transfers");
      const { transferPending } = await import("../services/transferJournal");
      await staging.update(() => []);
      await cloudStaging.discardAll();
      for (const row of (await transfers.load()).filter(transferPending))
        await transfers.cancel(row.id);
      window.dispatchEvent(new Event("shelf-pending-changed"));
      setAction("");
    } catch {
      setError("workingError");
    } finally {
      setDiscarding(false);
    }
  }
  if (!action)
    return (
      <>
        {search}
        {notice && <p role="status">{notice}</p>}
      </>
    );
  return (
    <>
      {search}
      <Modal
        isOpen
        className={styles.workingPanel + " " + styles.formPanel}
        onOpenChange={(open) => {
          if (!open && !discarding) close();
        }}
      >
        <Dialog>
          <Heading slot="title">
            {t(
              ["settings", "storageWipe"].includes(action)
                ? "commandSettings"
                : action,
            )}
          </Heading>
          {action === "uploadFiles" || action === "uploadFolder" ? (
            <HomeUpload
              roots={roots}
              onClose={close}
              directory={action === "uploadFolder"}
            />
          ) : ["settings", "storageWipe"].includes(action) ? (
            <>
              <StorageSettings
                startWipe={action === "storageWipe"}
                beforeWipe={cloud?.signOutAll}
              />
              {providerSettings}
              <ShortcutSettings
                bindings={bindings}
                onSave={(value) => {
                  setBindings(value);
                  close();
                }}
              />
            </>
          ) : action === "connectProvider" ? (
            providerSettings
          ) : action === "discardPending" ? (
            <>
              <p>{t("paletteDiscardConfirm")}</p>
              <Button
                variant="primary"
                isDisabled={discarding}
                onPress={() => void discardPending()}
              >
                {t("discardPending")}
              </Button>
            </>
          ) : job ? (
            <OperationReview job={job} onClose={close} />
          ) : action !== "paste" ? (
            <>
              {action !== "delete" && (
                <label>
                  {t("commandName")}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              {action === "delete" && <p>{t("commandDelete")}</p>}
              {action === "newFolder" && <p>{t("commandNewFolder")}</p>}
              <Button onPress={prepare}>{t("commandPreview")}</Button>
            </>
          ) : null}
          {error && <p role="alert">{t(error)}</p>}
          <Button isDisabled={discarding} onPress={close}>
            {t("workingCancel")}
          </Button>
        </Dialog>
      </Modal>
    </>
  );
}
