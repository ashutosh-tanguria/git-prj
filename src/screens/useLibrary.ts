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
import { recordOpen } from "../services/organizer";
import { githubTransferSource } from "../services/transferRequests";
import { clearToken, lockGitHubSession } from "../providers/github/client";
import type { GitHubOAuthSession } from "../providers/github/oauthSession";
export function useLibrary(offline: boolean) {
  const previewRequest = useRef<AbortController | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Entry[]>([]);
  const [selection, setSelection] = useState<Entry[]>([]);
  const [offlineAccount, setOfflineAccount] = useState("");
  const [offlineRoots, setOfflineRoots] = useState<Repo[]>([]);
  const [account, setAccount] = useState("");
  const initialGitHubAuthorization = useRef(false);
  const connectFromCallback = useRef(connect);
  connectFromCallback.current = connect;
  const [token, setToken] = useState("");
  const [roots, setRoots] = useState<Repo[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hash, setHash] = useState(location.hash);
  const [refreshVersion, refresh] = useState(0);
  const appliedRefresh = useRef(0);
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
  const activeAccount = account || (offline ? offlineAccount : "");
  useEffect(() => {
    const ended = () => {
      previewRequest.current?.abort();
      setAccount("");
      setPreview(undefined);
      setBlob(undefined);
      setEntries([]);
      setSelection([]);
      setLoading(false);
      setError(t("githubSessionEnded"));
    };
    window.addEventListener("shelf-github-auth-ended", ended);
    return () => window.removeEventListener("shelf-github-auth-ended", ended);
  }, []);
  useEffect(() => {
    if (
      initialGitHubAuthorization.current ||
      !import.meta.env.VITE_GITHUB_APP_CLIENT_ID ||
      !import.meta.env.VITE_OAUTH_WORKER_URL
    )
      return;
    initialGitHubAuthorization.current = true;
    if (!sessionStorage.getItem("shelf-github-oauth")) return;
    setLoading(true);
    void import("../providers/github/oauthFlow")
      .then(async (flow) => {
        try {
          const pending = flow.completeGitHubSignIn();
          if (pending) await connectFromCallback.current(await pending);
        } finally {
          flow.clearGitHubCompletion();
        }
      })
      .catch(() => {
        setLoading(false);
        setError(t("githubSignInError"));
      });
  }, []);
  useEffect(() => {
    let active = true;
    void import("../services/githubCache")
      .then((cache) => cache.rememberedGitHub())
      .then((saved) => {
        if (active && saved) {
          setOfflineAccount(saved.account);
          setOfflineRoots(saved.roots);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const force = () => refresh((version) => version + 1);
    window.addEventListener("shelf-refresh", force);
    return () => window.removeEventListener("shelf-refresh", force);
  }, []);
  useEffect(() => {
    const listener = () => setHash(location.hash);
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    setSelection([]);
    if (!activeAccount || !key) return;
    const controller = new AbortController();
    previewRequest.current = controller;
    setLoading(true);
    setError("");
    setBlob(undefined);
    setMediaProgress(undefined);
    const parsed = parseRef(key);
    const action = import("../services/githubCache").then(
      ({ readGitHub, listGitHub }) =>
        hash.startsWith("#/view/")
          ? readGitHub(activeAccount, parsed, controller.signal, (value) => {
              if (!controller.signal.aborted) setMediaProgress(value);
            }).then(async (value) => {
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
                listGitHub(
                  activeAccount,
                  {
                    ...parsed,
                    path: parsed.path.split("/").slice(0, -1).join("/"),
                  },
                  { signal: controller.signal },
                ),
                offline
                  ? Promise.resolve({})
                  : library.metadata(key, controller.signal),
              ]);
              if (controller.signal.aborted) return;
              const listed =
                results[0].status === "fulfilled"
                  ? results[0].value.find((entry) => entry.ref === key)
                  : undefined;
              const metadata =
                results[1].status === "fulfilled" ? results[1].value : {};
              const opened = { ...(listed || fallback), ...metadata };
              setSelection([opened]);
              recordOpen(githubTransferSource(activeAccount, opened));
            })
          : listGitHub(activeAccount, parsed, {
              signal: controller.signal,
              force: refreshVersion !== appliedRefresh.current,
              onUpdate: setEntries,
            }).then((rows) => {
              if (!controller.signal.aborted) {
                setEntries(rows);
                appliedRefresh.current = refreshVersion;
              }
            }),
    );
    void action
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setError(
            t(
              error.message === "mediaLimit"
                ? "mediaLimit"
                : error.message === "OFFLINE"
                  ? "offlineMissing"
                  : "readError",
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activeAccount, key, hash, refreshVersion, offline]);
  async function connect(
    candidate: string | GitHubOAuthSession = token,
    idleMinutes?: number,
  ) {
    setLoading(true);
    setError("");
    try {
      const login = await library.connect(candidate);
      setToken("");
      const repos = await library.roots();
      setRoots(repos);
      setAccount(login);
      setOfflineAccount(login);
      setOfflineRoots(repos);
      if (idleMinutes && typeof candidate !== "string") {
        const { watchGitHubIdle } =
          await import("../providers/github/oauthVault");
        watchGitHubIdle(candidate, idleMinutes, lockGitHubSession);
      }
      void import("../services/githubCache")
        .then((cache) => cache.rememberGitHub(login, repos))
        .catch(() => {});
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
      if (typeof candidate !== "string") clearToken();
      setToken("");
      setError(
        t(typeof candidate === "string" ? "connectError" : "githubSignInError"),
      );
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
      const { readGitHub } = await import("../services/githubCache");
      const bytes = await readGitHub(
        activeAccount,
        parseRef(entry.ref),
        controller.signal,
        (value) => {
          if (!controller.signal.aborted) setMediaProgress(value);
        },
      );
      if (!controller.signal.aborted) {
        setBlob(bytes);
        recordOpen(githubTransferSource(activeAccount, entry));
      }
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
    activeAccount,
    displayedRoots: account ? roots : offlineRoots,
    forgetOffline: () => {
      setOfflineAccount("");
      setOfflineRoots([]);
      void import("../services/githubCache")
        .then((cache) => cache.forgetGitHub())
        .catch(() => {});
    },
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
