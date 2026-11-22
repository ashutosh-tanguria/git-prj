import { cloudEnabled } from "../providers/flags";
import type { CloudLibrary } from "../components/cloudTypes";
import { nameMatches } from "../services/paletteQuery";
import type { TextMatch } from "../services/textSearch";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  FavoriteButton,
  renderItemTags,
  useOrganizer,
} from "../components/Organizer";
import type { LibraryItem } from "../services/organizer";
import {
  githubEndpoint,
  githubTransferSource,
} from "../services/transferRequests";
import { GuardMount } from "../components/GuardMount";
import { VisibilityBadge } from "../components/VisibilityBadge";
import { useLibrary } from "./useLibrary";
import { library } from "../services/library";
import { explorerRoute, parseRef, viewerRoute } from "../lib/refs";
import { ReadShell } from "../components/ReadShell";
import { FileTable } from "../components/FileTable";
import { AddressBar } from "../components/AddressBar";
import { GuardStrip, PendingTray, StatusBar } from "../components/ReadChrome";
import { ReadViewer } from "../viewers/ReadViewer";
import { ConnectPanel } from "../components/ConnectPanel";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { MediaStatus } from "../components/MediaStatus";
import styles from "../components/Library.module.css";
import { useOffline } from "../components/useOffline";
import { CommandBar } from "../components/CommandBar";
import type { FileView } from "../components/ViewMenu";
const LibraryPreview = lazy(() =>
  import("../components/LibraryPreview").then(({ LibraryPreview }) => ({
    default: LibraryPreview,
  })),
);
const IndexingStatus = lazy(() =>
  import("../components/IndexingStatus").then(({ IndexingStatus }) => ({
    default: IndexingStatus,
  })),
);
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
const CloudIntegration = lazy(() => import("../components/CloudIntegration"));
const TransferIntegration = lazy(
  () => import("../components/TransferIntegration"),
);
const SplitWorkspace = lazy(() => import("../components/SplitWorkspace"));
const LocalFolderTools = lazy(() => import("../components/LocalFolderTools"));
const ViewMenu = lazy(() =>
  import("../components/ViewMenu").then((module) => ({
    default: module.ViewMenu,
  })),
);
const LibraryExplorerViews = lazy(
  () => import("../components/LibraryExplorerViews"),
);
const OrganizerEditor = lazy(() =>
  import("../components/OrganizerEditor").then((module) => ({
    default: module.OrganizerEditor,
  })),
);
const MixedExplorer = lazy(() =>
  import("../components/MixedExplorer").then((module) => ({
    default: module.MixedExplorer,
  })),
);
export default function Library() {
  if (!cloudEnabled) return <LibraryScreen />;
  return (
    <Suspense fallback={null}>
      <CloudIntegration>
        {(cloud) => <LibraryScreen cloud={cloud} />}
      </CloudIntegration>
    </Suspense>
  );
}
function LibraryScreen({ cloud }: { cloud?: CloudLibrary }) {
  const [folderFilter, setFolderFilter] = useState({ key: "", query: "" });
  const [textMatch, setTextMatch] = useState<TextMatch>();
  const [notice, setNotice] = useState("");
  const [split, setSplit] = useState(false);
  const [view, setView] = useState<FileView>("viewList");
  const offline = useOffline();
  const state = useLibrary(offline);
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
  const organizer = useOrganizer(
    state.activeAccount,
    cloud?.locations.roots.map((root) => root.id) ?? [],
  );
  const virtualId = hash.startsWith("#/library/") ? hash.slice(10) : "";
  const virtualLabel =
    organizer.value.collections.find((label) => label.id === virtualId) ??
    organizer.value.tags.find((label) => "tag:" + label.id === virtualId);
  const rawMixed =
    virtualLabel?.items ??
    (virtualId === "recent"
      ? organizer.value.recent
      : organizer.value.favorites);
  const rootIds = JSON.stringify(
    cloud?.locations.roots.map((root) => root.id) ?? [],
  );
  const mixedItems = useMemo(
    () => organizer.accessible(rawMixed),
    [rawMixed, state.activeAccount, rootIds],
  );
  const [mixedSelection, setMixedSelection] = useState<{
    id: string;
    items: LibraryItem[];
  }>();
  const sourceFor = (entry: (typeof entries)[number]) =>
    state.activeAccount && entry.kind !== "special"
      ? githubTransferSource(state.activeAccount, entry)
      : undefined;
  const picked = virtualId
    ? mixedSelection?.id === virtualId
      ? organizer.accessible(mixedSelection.items)
      : []
    : cloud?.active
      ? cloud.transferSelection.filter((item) => "endpoint" in item)
      : selection.flatMap((entry) => sourceFor(entry) ?? []);
  const favorite = !split && (
    <FavoriteButton organizer={organizer} items={picked} />
  );
  const openVirtual = (id: string) => {
    setSplit(false);
    location.hash = "#/library/" + id;
  };
  const openMixed = ({ endpoint, entry }: LibraryItem) => {
    if (endpoint.provider === "github") {
      const parsed = parseRef(entry.ref);
      location.hash =
        entry.kind === "dir" ? explorerRoute(parsed) : viewerRoute(parsed);
    } else {
      cloud?.openFilenameResult({
        ...entry,
        scope: endpoint.provider + ":" + endpoint.locationId,
        path: entry.name,
      });
    }
  };
  const destination = cloud?.active
    ? cloud.transferDestination
    : account && ref && !hash.startsWith("#/view/")
      ? githubEndpoint(account, ref)
      : undefined;
  async function exportCollections() {
    const { requestCollectionsExport } =
      await import("../services/organizerPortability");
    requestCollectionsExport(organizer.value);
  }
  async function importCollections() {
    if (!destination) return;
    try {
      const { readPortableOrganizer, mergeLabels } =
        await import("../services/organizerPortability");
      const imported = await readPortableOrganizer(
        destination,
        account,
        cloud?.transferProvider(destination),
      );
      organizer.change((old) => ({
        ...old,
        collections: mergeLabels(old.collections, imported.collections),
        tags: mergeLabels(old.tags, imported.tags),
      }));
      setNotice(t("collectionsImported"));
    } catch {
      organizer.setError("organizerInvalid");
    }
  }
  function disconnect() {
    previewRequest.current?.abort();
    setPreview(undefined);
    setSelection([]);
    library.disconnect();
    state.forgetOffline();
    setAccount("");
    setRoots([]);
    setEntries([]);
    setBlob(undefined);
  }
  const folderKey = cloud?.active ? (cloud.locations.active ?? "") : key;
  const folderQuery = folderFilter.key === folderKey ? folderFilter.query : "";
  const filteredEntries = useMemo(
    () =>
      folderQuery
        ? entries.filter((entry) => nameMatches(entry.name, folderQuery))
        : entries,
    [entries, folderQuery],
  );
  const changeView = (next: FileView) => {
    if (view === next && !split) return;
    setView(next);
    setSplit(false);
    setSelection([]);
    cloud?.explorer?.select([]);
    setMixedSelection(undefined);
  };
  const commandRef =
    view === "viewColumns" && ref && selection[0] && !virtualId
      ? { ...ref, path: selection[0].path.split("/").slice(0, -1).join("/") }
      : ref;
  const onMixedSelect = (items: LibraryItem[]) =>
    setMixedSelection({ id: virtualId, items });
  const alternate = view !== "viewList" && (
    <Suspense fallback={<p role="status">{t("loadingRead")}</p>}>
      <LibraryExplorerViews
        key={view}
        account={state.activeAccount}
        roots={state.displayedRoots}
        current={ref}
        cloud={cloud}
        view={view}
        rows={filteredEntries}
        locationKey={virtualId || key}
        mixed={
          virtualId
            ? { items: mixedItems, open: openMixed, select: onMixedSelect }
            : undefined
        }
        onOpen={open}
        onPreview={(entry) => void quick(entry)}
        onSelect={setSelection}
      />
    </Suspense>
  );
  const canSearchFolder =
    !split &&
    !virtualId &&
    (!!cloud?.active ||
      (!!state.activeAccount && !!ref && !hash.startsWith("#/view/")));
  const indexScopes = [
    ...(state.activeAccount
      ? ["github:" + state.activeAccount.toLowerCase()]
      : []),
    ...(cloud?.locations.roots ?? []).map(
      (root) => root.provider + ":" + root.id,
    ),
  ];
  const connection = {
    token,
    onToken: setToken,
    onConnect: () => void connect(),
    loading,
  };
  return (
    <div className={styles.shell}>
      <CommandBar
        viewMenu={
          <Suspense fallback={null}>
            <ViewMenu active={view} onChange={changeView} />
          </Suspense>
        }
        favorite={favorite}
        split={split}
        offline={offline}
        keepOffline={
          selection.some((entry) => entry.kind === "file") ||
          !!cloud?.transferSelection.length
        }
      />
      <header className={styles.brand}>
        <h1>Shelf</h1>
        {account && (
          <Button variant="quiet" onPress={disconnect}>
            {t("disconnect")}
          </Button>
        )}
      </header>
      <AddressBar
        onRefresh={cloud?.active ? cloud.refresh : refresh}
        filter={folderQuery}
        onFilter={
          canSearchFolder
            ? (query) => {
                setFolderFilter({ key: folderKey, query });
                if (cloud?.active) cloud.filterFolder(query);
              }
            : undefined
        }
        key={"address:" + key}
        value={cloud?.active ? (cloud.locations.active ?? "") : key}
        onGo={(value) => {
          try {
            if (cloud?.active && value === cloud.locations.active) return;
            location.hash = explorerRoute(parseRef(value));
          } catch {
            setError(t("badAddress"));
          }
        }}
      />
      <ReadShell
        virtualLocations={{
          active: virtualId,
          collections: organizer.value.collections,
          tags: organizer.value.tags,
          open: openVirtual,
          create: () => organizer.setEditor({ kind: "collections", items: [] }),
          add: (id, items) => organizer.apply("collections", id, items),
          exportLabels: exportCollections,
          importLabels: destination
            ? () => void importCollections()
            : undefined,
        }}
        favorite={
          <>
            {favorite}
            {renderItemTags(picked, organizer)}
          </>
        }
        roots={state.displayedRoots}
        account={state.activeAccount}
        clouds={cloud?.locations}
        selection={selection}
        visibility={visibility}
        onSplit={() => setSplit((open) => !open)}
        selectionBlob={
          hash.startsWith("#/view/") && !preview ? blob : undefined
        }
        onParent={() => {
          if (cloud?.active) {
            cloud.parent();
            return;
          }
          if (ref) {
            location.hash = explorerRoute({
              ...ref,
              path: ref.path.split("/").slice(0, -1).join("/"),
            });
          }
        }}
      >
        {indexScopes.length > 0 && (
          <Suspense fallback={null}>
            <IndexingStatus scopes={indexScopes} />
          </Suspense>
        )}
        {!preview && (
          <MediaStatus
            value={state.mediaProgress}
            onCancel={state.cancelMedia}
          />
        )}
        {notice && <p role="status">{notice}</p>}
        {organizer.error && <p role="alert">{t(organizer.error)}</p>}
        {split ? (
          <Suspense fallback={<p role="status">{t("loadingRead")}</p>}>
            <SplitWorkspace
              account={account}
              roots={roots}
              current={ref}
              cloud={cloud}
            />
          </Suspense>
        ) : virtualId ? (
          <>
            <h2 className={styles.locationHeading}>
              {virtualLabel?.name ??
                t(
                  virtualId === "recent"
                    ? "recent"
                    : virtualId === "favorites"
                      ? "favorites"
                      : "collections",
                )}
            </h2>
            {alternate || (
              <Suspense fallback={null}>
                <MixedExplorer
                  key={virtualId}
                  id={virtualId}
                  items={mixedItems}
                  organizer={organizer}
                  onOpen={openMixed}
                  onSelect={onMixedSelect}
                />
              </Suspense>
            )}
          </>
        ) : cloud?.active ? (
          cloud.content(alternate || undefined)
        ) : !state.activeAccount ? (
          <ConnectPanel {...connection} providerRows={cloud?.connectRows} />
        ) : (
          <>
            <h2 className={styles.locationHeading}>
              {ref?.repo} <VisibilityBadge visibility={visibility} />
            </h2>
            {hash.startsWith("#/view/")
              ? blob && (
                  <ReadViewer
                    blob={blob}
                    name={ref?.path.split("/").at(-1) || ""}
                    fileKey={key}
                    textMatch={textMatch?.ref === key ? textMatch : undefined}
                  />
                )
              : alternate || (
                  <FileTable
                    reference={sourceFor}
                    tags={(item) => renderItemTags([item], organizer)}
                    entries={filteredEntries}
                    filtered={!!folderQuery.trim()}
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
      {state.activeAccount && ref && (
        <GuardMount
          key={"guard:" + key}
          roots={state.displayedRoots}
          current={ref}
          entries={entries}
          account={state.activeAccount}
          cloud={cloud}
        />
      )}
      <Suspense fallback={null}>
        <LocalFolderTools
          account={account}
          roots={roots}
          current={ref}
          cloud={cloud}
          selection={selection}
        />
        <SiteEntry
          organizer={organizer}
          current={account && !cloud?.active ? ref : null}
          selection={selection}
          account={state.activeAccount}
        />
        <LibraryCommands
          toolItems={split ? [] : picked}
          listed={entries}
          collection={
            virtualLabel && !virtualId.startsWith("tag:")
              ? { name: virtualLabel.name, items: mixedItems }
              : undefined
          }
          onView={changeView}
          tags={organizer.value.tags}
          onTag={(id) => openVirtual("tag:" + id)}
          current={commandRef}
          onFilenameResult={(item) => {
            if (item.scope.startsWith("github:")) {
              setTextMatch(undefined);
              const parsed = parseRef(item.ref);
              location.hash =
                item.kind === "dir"
                  ? explorerRoute(parsed)
                  : viewerRoute(parsed);
            } else cloud?.openFilenameResult(item);
          }}
          onTextResult={(item) => {
            if (item.scope.startsWith("github:")) {
              setTextMatch(item);
              location.hash = viewerRoute(parseRef(item.ref));
            } else cloud?.openTextResult(item);
          }}
          selection={selection}
          roots={state.displayedRoots}
          cloudCommand={cloud?.command}
          cloud={cloud}
          account={state.activeAccount}
          providerSettings={
            <>
              {cloud?.settings}
              <ConnectPanel
                {...connection}
                settings
                connected={!!account}
                onDisconnect={disconnect}
              />
            </>
          }
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
        <TransferIntegration
          account={account}
          roots={roots}
          current={ref}
          cloud={cloud}
          refreshed={cloud?.active ? cloud.refresh : refresh}
        />
      </Suspense>
      {cloud?.active ? (
        <StatusBar account="" extra={cloud.status} />
      ) : (
        <>
          <PendingTray />
          <GuardStrip
            repo={roots.find(
              (repo) => repo.full_name === ref?.owner + "/" + ref?.repo,
            )}
          />
          <StatusBar
            account={account}
            entries={entries}
            selection={selection}
          />
        </>
      )}
      {cloud?.dialogs}
      {organizer.editor && (
        <Suspense fallback={null}>
          <OrganizerEditor editor={organizer.editor} organizer={organizer} />
        </Suspense>
      )}
      {preview && (
        <Suspense fallback={null}>
          <LibraryPreview state={state} />
        </Suspense>
      )}
    </div>
  );
}
