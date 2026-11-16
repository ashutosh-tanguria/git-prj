import { useEffect, useState, useRef } from "react";
import { library, type Repo, type Entry } from "../services/library";
import {
  routeRef,
  refString,
  parseRef,
  explorerRoute,
  viewerRoute,
  type GitRef,
} from "../lib/refs";
import { Locations } from "../components/Locations";
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
  const previewRequest = useRef<AbortController | null>(null);
  const [account, setAccount] = useState("");
  const [token, setToken] = useState("");
  const [roots, setRoots] = useState<Repo[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hash, setHash] = useState(location.hash);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blob, setBlob] = useState<Blob>();
  const [preview, setPreview] = useState<Entry>();
  let ref: GitRef | null = null;
  try {
    ref = routeRef(hash);
  } catch {
    /* Invalid routes are shown as typed UI errors below. */
  }
  const key = ref ? refString(ref) : "";
  useEffect(() => {
    const listener = () => setHash(location.hash);
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (!account || !key) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setBlob(undefined);
    const parsed = parseRef(key);
    const action = hash.startsWith("#/view/")
      ? library.read(parsed, controller.signal).then(setBlob)
      : library.list(parsed, controller.signal).then(setEntries);
    void action
      .catch(() => {
        if (!controller.signal.aborted) setError(t("readError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [account, key, hash]);
  async function connect() {
    setLoading(true);
    setError("");
    try {
      const login = await library.connect(token);
      setToken("");
      const repos = await library.roots();
      setRoots(repos);
      setAccount(login);
      if (!ref && repos[0]) {
        const [owner, repo] = repos[0].full_name.split("/");
        location.hash = explorerRoute({
          owner,
          repo,
          branch: repos[0].default_branch,
          path: "",
        });
      }
    } catch {
      setToken("");
      setError(t("connectError"));
    } finally {
      setLoading(false);
    }
  }
  function open(entry: Entry) {
    if (!ref) return;
    location.hash =
      entry.kind === "dir"
        ? explorerRoute({ ...ref, path: entry.path })
        : viewerRoute({ ...ref, path: entry.path });
  }
  async function quick(entry: Entry) {
    previewRequest.current?.abort();
    const controller = new AbortController();
    previewRequest.current = controller;
    if (entry.kind !== "file") return;
    setPreview(entry);
    setBlob(undefined);
    try {
      const bytes = await library.read(parseRef(entry.ref), controller.signal);
      if (!controller.signal.aborted) setBlob(bytes);
    } catch {
      setError(t("readError"));
    }
  }
  return (
    <div className={styles.shell}>
      <header>
        <h1>Shelf</h1>
        {account && (
          <Button
            onPress={() => {
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
      <div className={styles.body}>
        <Locations repos={roots} />
        <main className={styles.content}>
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
              <h2>{ref?.repo}</h2>
              {hash.startsWith("#/view/") ? (
                blob && (
                  <ReadViewer
                    blob={blob}
                    name={ref?.path.split("/").at(-1) || ""}
                  />
                )
              ) : (
                <FileTable
                  entries={entries}
                  onOpen={open}
                  onPreview={(entry) => {
                    void quick(entry);
                  }}
                />
              )}
            </>
          )}
          {loading && <p role="status">{t("loadingRead")}</p>}
          {error && <p role="alert">{error}</p>}
        </main>
      </div>
      <PendingTray />
      <GuardStrip />
      <StatusBar account={account} />
      {preview && (
        <QuickLook
          title={preview.name}
          onClose={() => {
            previewRequest.current?.abort();
            setPreview(undefined);
            setBlob(undefined);
          }}
        >
          {blob ? (
            <ReadViewer blob={blob} name={preview.name} />
          ) : (
            <p>{t("loadingRead")}</p>
          )}
        </QuickLook>
      )}
    </div>
  );
}
