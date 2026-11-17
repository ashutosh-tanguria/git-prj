import { useEffect, useId, useState } from "react";
import type { Change } from "../services/staging";
import type { library } from "../services/library";
import {
  defaultDestinationSource,
  applyDestination,
} from "../services/destinationSource";
import type { GitRef } from "../lib/refs";
import { destinationKey, folderPath } from "../services/destinations";
import { preference, savePreference } from "../services/preferences";
import { Button } from "../ui/Button";
import { t } from "../i18n";
export function DestinationEditor({
  rows,
  source = defaultDestinationSource,
  onApply = applyDestination,
}: {
  rows: Change[];
  source?: Pick<typeof library, "roots" | "list"> & {
    branches?: (repository: string, signal: AbortSignal) => Promise<string[]>;
  };
  onApply?: (target: GitRef) => Promise<void>;
}) {
  const id = useId();
  const first = rows[0]?.target;
  const [repository, setRepository] = useState(
      first ? first.owner + "/" + first.repo : "",
    ),
    [branch, setBranch] = useState(first?.branch || "main"),
    [folder, setFolder] = useState(
      (rows[0]?.groupLabel || first?.path)?.split("/").slice(0, -1).join("/") ||
        "",
    ),
    [folders, setFolders] = useState<string[]>([]),
    [branches, setBranches] = useState<string[]>([]),
    [repos, setRepos] = useState<string[]>([]),
    [pin, setPin] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void preference<GitRef | undefined>("pinnedDestination", undefined).then(
      (pin) => {
        if (active)
          setPin(
            !!pin &&
              destinationKey(pin) ===
                destinationKey({
                  owner: first?.owner || "",
                  repo: first?.repo || "",
                  branch: first?.branch || "main",
                  path: first?.path.split("/").slice(0, -1).join("/") || "",
                }),
          );
      },
    );
    return () => {
      active = false;
    };
  }, [first?.owner, first?.repo, first?.branch]);
  useEffect(() => {
    const abort = new AbortController();
    if (!source.branches) return;
    void source
      .branches(repository, abort.signal)
      .then((values) => {
        if (!abort.signal.aborted) setBranches(values);
      })
      .catch(() => {
        if (!abort.signal.aborted) setBranches([]);
      });
    return () => abort.abort();
  }, [repository, source]);
  useEffect(() => {
    void source
      .roots()
      .then((values) => setRepos(values.map((r) => r.full_name)))
      .catch(() => setError(true));
  }, [source]);
  useEffect(() => {
    const abort = new AbortController(),
      [owner, repo] = repository.split("/"),
      parent = folder.includes("/")
        ? folder.slice(0, folder.lastIndexOf("/"))
        : "";
    if (!owner || !repo) return;
    const timer = setTimeout(
      () =>
        void source
          .list({ owner, repo, branch, path: parent }, abort.signal)
          .then((entries) =>
            setFolders(
              entries.filter((e) => e.kind === "dir").map((e) => e.path),
            ),
          )
          .catch(() => {
            if (!abort.signal.aborted) setFolders([]);
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [repository, branch, folder, source]);
  const apply = async () => {
    try {
      const path = folderPath(folder),
        [owner, repo] = repository.split("/");
      if (!owner || !repo || !branch || rows.some((c) => c.kind !== "add"))
        throw Error("destinationInvalid");
      const target = { owner, repo, branch, path };
      await onApply(target);
      await savePreference("pinnedDestination", pin ? target : null);
      setError(false);
    } catch {
      setError(true);
    }
  };
  return (
    <details>
      <summary>{t("destinationChange")}</summary>
      <label>
        {t("destination")}
        <input
          list={id + "-repos"}
          value={repository}
          onChange={(e) => setRepository(e.target.value)}
        />
      </label>
      <datalist id={id + "-repos"}>
        {repos.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      {!repos.length && (
        <Button
          onPress={() =>
            window.dispatchEvent(
              new CustomEvent("shelf-command", {
                detail: { action: "newRepository" },
              }),
            )
          }
        >
          {t("newRepository")}
        </Button>
      )}
      <label>
        {t("branch")}
        <input
          list={id + "-branches"}
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </label>
      <datalist id={id + "-branches"}>
        {branches.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <label>
        {t("destinationFolder")}
        <input
          list={id + "-folders"}
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
      </label>
      <datalist id={id + "-folders"}>
        {folders.map((path) => (
          <option key={path} value={path} />
        ))}
        {folder && (
          <option value={folder}>
            {t("destinationCreate")} {folder}
          </option>
        )}
      </datalist>
      <label>
        <input
          type="checkbox"
          checked={pin}
          onChange={(e) => setPin(e.target.checked)}
        />
        {t("destinationPin")}
      </label>
      <Button onPress={() => void apply()}>{t("destinationApply")}</Button>
      {error && <p role="alert">{t("destinationInvalid")}</p>}
    </details>
  );
}
