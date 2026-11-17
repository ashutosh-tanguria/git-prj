import { useEffect, useRef, useState } from "react";
import { library, type Repo, type Entry } from "../services/library";
import {
  routeRef,
  refString,
  parseRef,
  explorerRoute,
  viewerRoute,
  type GitRef,
} from "../lib/refs";
import { t } from "../i18n";
import type { MediaProgress } from "../services/mediaRead";
export function useLibrary() {
  const previewRequest = useRef<AbortController | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Entry[]>([]);
  const [selection, setSelection] = useState<Entry[]>([]);
  const [account, setAccount] = useState("");
  const [token, setToken] = useState("");
  const [roots, setRoots] = useState<Repo[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hash, setHash] = useState(location.hash);
  const [refreshVersion, refresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blob, setBlob] = useState<Blob>();
  const [mediaProgress, setMediaProgress] = useState<MediaProgress>();
  const [previewError, setPreviewError] = useState("");
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
    setSelection([]);
    if (!account || !key) return;
    const controller = new AbortController();
    previewRequest.current = controller;
    setLoading(true);
    setError("");
    setBlob(undefined);
    setMediaProgress(undefined);
    const parsed = parseRef(key);
    const action = hash.startsWith("#/view/")
      ? library
          .read(parsed, controller.signal, (value) => {
            if (!controller.signal.aborted) setMediaProgress(value);
          })
          .then(async (value) => {
            if (controller.signal.aborted) return;
            setBlob(value);
            const fallback: Entry = {
              name: parsed.path.split("/").at(-1) || "",
              path: parsed.path,
              ref: key,
              size: value.size,
              sha: "",
              kind: "file",
            };
            setSelection([fallback]);
            const results = await Promise.allSettled([
              library.list(
                {
                  ...parsed,
                  path: parsed.path.split("/").slice(0, -1).join("/"),
                },
                controller.signal,
              ),
              library.metadata(key, controller.signal),
            ]);
            if (controller.signal.aborted) return;
            const listed =
              results[0].status === "fulfilled"
                ? results[0].value.find((entry) => entry.ref === key)
                : undefined;
            const metadata =
              results[1].status === "fulfilled" ? results[1].value : {};
            setSelection([{ ...(listed || fallback), ...metadata }]);
          })
      : library.list(parsed, controller.signal).then(setEntries);
    void action
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setError(
            t(error.message === "mediaLimit" ? "mediaLimit" : "readError"),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [account, key, hash, refreshVersion]);
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
  async function quick(entry: Entry, rows?: Entry[]) {
    setPreviewError("");
    if (rows) setPreviewOrder(rows.filter((row) => row.kind === "file"));
    previewRequest.current?.abort();
    const controller = new AbortController();
    previewRequest.current = controller;
    if (entry.kind !== "file") return;
    setPreview(entry);
    setBlob(undefined);
    setMediaProgress(undefined);
    try {
      const bytes = await library.read(
        parseRef(entry.ref),
        controller.signal,
        (value) => {
          if (!controller.signal.aborted) setMediaProgress(value);
        },
      );
      if (!controller.signal.aborted) setBlob(bytes);
    } catch (error) {
      if (!controller.signal.aborted)
        setPreviewError(
          t(
            (error as Error).message === "mediaLimit"
              ? "mediaLimit"
              : "readError",
          ),
        );
    }
  }
  return {
    cancelMedia: () => {
      previewRequest.current?.abort();
      setLoading(false);
      setMediaProgress(undefined);
      if (preview) setPreviewError(t("mediaCancelled"));
      else setError(t("mediaCancelled"));
    },
    mediaProgress,
    refresh: () => refresh((version) => version + 1),
    visibility:
      roots.find((repo) => repo.full_name === ref?.owner + "/" + ref?.repo)
        ?.private === undefined
        ? t("unknown")
        : roots.find((repo) => repo.full_name === ref?.owner + "/" + ref?.repo)
              ?.private
          ? t("private")
          : t("public"),
    previewError,
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
  };
}
