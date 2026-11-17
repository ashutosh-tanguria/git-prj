import { lazy, Suspense, useState } from "react";
import { GuardMount } from "../components/GuardMount";
import { VisibilityBadge } from "../components/VisibilityBadge";
import { useLibrary } from "./useLibrary";
import { CommandBar } from "../components/CommandBar";
import { library } from "../services/library";
import { explorerRoute, parseRef } from "../lib/refs";
import { ReadShell } from "../components/ReadShell";
import { FileTable } from "../components/FileTable";
import { AddressBar } from "../components/AddressBar";
import { GuardStrip, PendingTray, StatusBar } from "../components/ReadChrome";
import { LibraryPreview } from "../components/LibraryPreview";
import { ReadViewer } from "../viewers/ReadViewer";
import { ConnectPanel } from "../components/ConnectPanel";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { MediaStatus } from "../components/MediaStatus";
import styles from "../components/Library.module.css";
const LibraryCommands = lazy(() =>
  import("../components/LibraryCommands").then((m) => ({
    default: m.LibraryCommands,
  })),
);
const SiteEntry = lazy(() =>
  import("../components/SiteEntry").then((module) => ({
    default: module.SiteEntry,
  })),
);
export default function Library() {
  const [notice, setNotice] = useState("");
  const state = useLibrary();
  const {
    refresh,
    visibility,
    previewRequest,
    account,
    setAccount,
    token,
    setToken,
    roots,
    setRoots,
    entries,
    setEntries,
    hash,
    error,
    setError,
    loading,
    blob,
    setBlob,
    preview,
    setPreview,
    ref,
    key,
    selection,
    setSelection,
    connect,
    open,
    quick,
  } = state;
  return (
    <div className={styles.shell}>
      <CommandBar />
      <header className={styles.brand}>
        <h1>Shelf</h1>
        {account && (
          <Button
            variant="quiet"
            onPress={() => {
              previewRequest.current?.abort();
              setPreview(undefined);
              setSelection([]);
              library.disconnect();
              setAccount("");
              setRoots([]);
              setEntries([]);
              setBlob(undefined);
            }}
          >
            {t("disconnect")}
          </Button>
        )}
      </header>
      <AddressBar
        onRefresh={refresh}
        key={key}
        value={key}
        onGo={(value) => {
          try {
            location.hash = explorerRoute(parseRef(value));
          } catch {
            setError(t("badAddress"));
          }
        }}
      />
      <ReadShell
        roots={roots}
        selection={selection}
        visibility={visibility}
        selectionBlob={
          hash.startsWith("#/view/") && !preview ? blob : undefined
        }
        onParent={() => {
          if (ref) {
            location.hash = explorerRoute({
              ...ref,
              path: ref.path.split("/").slice(0, -1).join("/"),
            });
          }
        }}
      >
        {!preview && (
          <MediaStatus
            value={state.mediaProgress}
            onCancel={state.cancelMedia}
          />
        )}
        {notice && <p role="status">{notice}</p>}
        {!account ? (
          <ConnectPanel
            token={token}
            onToken={setToken}
            onConnect={() => {
              void connect();
            }}
            loading={loading}
          />
        ) : (
          <>
            <h2 className={styles.locationHeading}>
              {ref?.repo} <VisibilityBadge visibility={visibility} />
            </h2>
            {hash.startsWith("#/view/") ? (
              blob && (
                <ReadViewer
                  blob={blob}
                  name={ref?.path.split("/").at(-1) || ""}
                  fileKey={key}
                />
              )
            ) : (
              <FileTable
                entries={entries}
                onSelectionChange={setSelection}
                locationKey={key}
                onOpen={open}
                onPreview={(entry, rows) => {
                  void quick(entry, rows);
                }}
              />
            )}
          </>
        )}
        {loading && <p role="status">{t("loadingRead")}</p>}
        {error && <p role="alert">{error}</p>}
      </ReadShell>
      {account && ref && (
        <GuardMount key={key} roots={roots} current={ref} entries={entries} />
      )}
      <Suspense fallback={null}>
        <SiteEntry current={account ? ref : null} selection={selection} />
        <LibraryCommands
          current={ref}
          selection={selection}
          roots={roots}
          onRefresh={async () => {
            setRoots(await library.roots());
          }}
          onCreated={(repo, branchWarning) => {
            setRoots((old) => [
              ...old.filter((r) => r.full_name !== repo.full_name),
              repo,
            ]);
            const [owner, name] = repo.full_name.split("/");
            location.hash = explorerRoute({
              owner,
              repo: name,
              branch: repo.default_branch,
              path: "",
            });
            setNotice(
              t("repoCreated") +
                " " +
                repo.full_name +
                " (" +
                t(repo.private ? "repoPrivate" : "repoPublic") +
                ")" +
                (branchWarning ? ". " + t("repoBranchWarning") : ""),
            );
          }}
        />
      </Suspense>
      <PendingTray />
      <GuardStrip
        repo={roots.find(
          (repo) => repo.full_name === ref?.owner + "/" + ref?.repo,
        )}
      />
      <StatusBar account={account} entries={entries} selection={selection} />
      <LibraryPreview state={state} />
    </div>
  );
}
