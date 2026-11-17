import { filterLinkedChanges } from "../services/groupedChanges";
import "../i18n/m3b";
import { usePushChoice } from "./usePushChoice";
import { commitMessage } from "../services/commitMessage";
import { destinationKey } from "../services/destinations";
import { preference, savePreference } from "../services/preferences";
import "../i18n/working";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { staging } from "../services/workingStorage";
import { exportWorking } from "../services/workingBackup";
import { pushChanges, ConflictError } from "../services/githubPush";
import { t } from "../i18n";

export function useWorkingCopy() {
  const rows = useSyncExternalStore(staging.subscribe, staging.snapshot),
    [open, setOpen] = useState(false),
    [message, setMessageValue] = useState("Update working copy"),
    [publicConfirm, setPublic] = useState(false),
    [warnings, setWarnings] = useState(false),
    [sensitive, setSensitive] = useState(false),
    [commits, setCommits] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [ref, setRef] = useState(false),
    [conflicts, setConflicts] = useState<string[]>([]),
    [persisted, setPersisted] = useState(false),
    [filter, setFilter] = useState("all");
  const [edited, setEdited] = useState(false);
  const setMessage = (value: string) => {
    setEdited(true);
    setMessageValue(value);
  };
  useEffect(() => {
    setPublic(false);
    setWarnings(false);
    setSensitive(false);
    setOverrideConfirmed(false);
    setRepoOverride("");
  }, [rows]);
  useEffect(() => {
    if (!edited)
      setMessageValue(
        commitMessage(
          rows,
          rows[0]?.target.path.split("/").slice(0, -1).join("/") || "",
        ),
      );
  }, [rows, edited]);
  const { quick, setQuick, anchor } = usePushChoice(
    rows,
    () => {
      setPublic(false);
      setWarnings(false);
      setSensitive(false);
      setOpen(true);
    },
    !!conflicts.length,
  );
  const [now, setNow] = useState(Date.now()),
    [installHint, setInstallHint] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent))
      void preference("working-ios-hint", false).then((seen) => {
        if (!seen) {
          setInstallHint(true);
          void savePreference("working-ios-hint", true);
        }
      });
    return () => clearInterval(timer);
  }, []);
  const [repoOverride, setRepoOverride] = useState(""),
    [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const restore = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    void staging.load().catch(() => setError(t("workingError")));
  }, []);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (rows.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const key = (e: KeyboardEvent) => {
      if (
        !(e.target as HTMLElement).closest(
          "input,textarea,[contenteditable=true]",
        ) &&
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        void (e.shiftKey ? staging.redo() : staging.undo()).catch(() =>
          setError(t("workingError")),
        );
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("keydown", key);
    if (rows.length) void navigator.storage?.persisted?.().then(setPersisted);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("keydown", key);
    };
  }, [rows]);
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch {
      setError(t("workingError"));
    }
  };
  const download = () =>
    run(async () => {
      const blob = await exportWorking(rows, staging.read),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "shelf-working-copy.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const push = async () => {
    setBusy(true);
    setRef(false);
    setError("");
    controller.current = new AbortController();
    try {
      const groups = new Map<string, typeof rows>();
      for (const row of rows) {
        const key =
          row.target.owner + "/" + row.target.repo + "@" + row.target.branch;
        groups.set(key, [...(groups.get(key) || []), row]);
      }
      for (const group of groups.values()) {
        const result = await pushChanges(group, staging.read, {
          message,
          repoOverride: overrideConfirmed ? repoOverride : undefined,
          publicConfirmed: publicConfirm,
          warningsConfirmed: warnings,
          sensitiveConfirmed: sensitive,
          signal: controller.current.signal,
          onRef: () => setRef(true),
        });
        setCommits((old) =>
          [
            ...new Set([
              ...old,
              ...result.map(
                (sha) =>
                  "https://github.com/" +
                  encodeURIComponent(group[0].target.owner) +
                  "/" +
                  encodeURIComponent(group[0].target.repo) +
                  "/commit/" +
                  encodeURIComponent(sha),
              ),
            ]),
          ].slice(-10),
        );
        await staging.discard(group.map((c) => c.id));
      }
      if (rows[0]) {
        const destination = {
          ...rows[0].target,
          path: rows[0].target.path.split("/").slice(0, -1).join("/"),
        };
        await savePreference("lastDestination", destination);
        const used = await preference<string[]>("usedDestinations", []);
        await savePreference("usedDestinations", [
          ...new Set([...used, destinationKey(destination)]),
        ]);
      }
      setEdited(false);
      setError(t("workingSuccess"));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch (e) {
      setQuick(false);
      if (e instanceof ConflictError) setConflicts(e.paths);
      setError(
        t(
          e instanceof Error && e.message === "PERMISSION"
            ? "workingPermission"
            : "workingError",
        ),
      );
    } finally {
      setBusy(false);
      setPublic(false);
      setWarnings(false);
      setSensitive(false);
      setOverrideConfirmed(false);
      setRepoOverride("");
    }
  };
  const shown = filterLinkedChanges(rows, filter),
    groups = new Map<string, typeof rows>();
  for (const row of shown) {
    const key =
      "GitHub / " +
      row.target.owner +
      "/" +
      row.target.repo +
      "@" +
      row.target.branch +
      " / " +
      (row.groupId || row.id);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return {
    commits,
    quick,
    anchor,
    setQuick,
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
  };
}
