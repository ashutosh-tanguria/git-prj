import { useLibrary } from "./useLibrary";
import { CommandBar } from "../components/CommandBar";
import { library } from "../services/library";
import { explorerRoute, parseRef } from "../lib/refs";
import { ReadShell } from "../components/ReadShell";
import { FileTable } from "../components/FileTable";
import { AddressBar } from "../components/AddressBar";
import { GuardStrip, PendingTray, StatusBar } from "../components/ReadChrome";
import { QuickLook } from "../components/QuickLook";
import { ReadViewer } from "../viewers/ReadViewer";
import { ConnectPanel } from "../components/ConnectPanel";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "../components/Library.module.css";
export default function Library() {
  const {
    refresh,
    previewError,
    visibility,
    previewOrder,
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
  } = useLibrary();
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
            <h2 className={styles.locationHeading}>{ref?.repo}</h2>
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
      <PendingTray />
      <GuardStrip repo={roots.find(repo=>repo.full_name === ref?.owner+"/"+ref?.repo)} />
      <StatusBar account={account} entries={entries} selection={selection} />
      {preview && (
        <QuickLook
          title={preview.name}
          onPrevious={() => {
            const i = previewOrder.findIndex(
              (item) => item.ref === preview.ref,
            );
            const next =
              previewOrder[(i - 1 + previewOrder.length) % previewOrder.length];
            if (next) void quick(next);
          }}
          onNext={() => {
            const i = previewOrder.findIndex(
              (item) => item.ref === preview.ref,
            );
            const next = previewOrder[(i + 1) % previewOrder.length];
            if (next) void quick(next);
          }}
          onOpen={() => {
            previewRequest.current?.abort();
            setPreview(undefined);
            setBlob(undefined);
            open(preview);
          }}
          onClose={() => {
            previewRequest.current?.abort();
            setPreview(undefined);
            setBlob(undefined);
          }}
        >
          {previewError ? (
            <p role="alert">{previewError}</p>
          ) : blob ? (
            <ReadViewer blob={blob} name={preview.name} fileKey={preview.ref} />
          ) : (
            <p role="status">{t("loadingRead")}</p>
          )}
        </QuickLook>
      )}
    </div>
  );
}
