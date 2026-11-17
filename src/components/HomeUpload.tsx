import type { CollisionChoice } from "../services/folderTypes";
import { OperationReview, type OperationJob } from "./OperationReview";
import { directoryFiles } from "../services/folderUpload";
import { planFolderUpload } from "../services/folderOperations";
import { useEffect, useState } from "react";
import { preference } from "../services/preferences";
import type { GitRef } from "../lib/refs";
import type { Repo, Entry } from "../services/library";
import { library } from "../services/library";
import { request } from "../providers/github/client";
import { folderPath } from "../services/destinations";
import { stageUploads } from "../services/stageUploads";
import { GuardReview } from "./GuardReview";
import { t } from "../i18n";
export function HomeUpload({
  roots,
  onClose,
  directory = false,
}: {
  roots: Repo[];
  onClose: () => void;
  directory?: boolean;
}) {
  const [job, setJob] = useState<OperationJob>();
  const [repository, setRepository] = useState(roots[0]?.full_name || ""),
    [folder, setFolder] = useState(""),
    [branch, setBranch] = useState(roots[0]?.default_branch || "main"),
    [files, setFiles] = useState<File[]>(),
    [repo, setRepo] = useState<Repo>(),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void preference<GitRef | undefined>("pinnedDestination", undefined).then(
      (pin) => {
        if (
          active &&
          pin &&
          roots.some((r) => r.full_name === pin.owner + "/" + pin.repo)
        ) {
          setRepository(pin.owner + "/" + pin.repo);
          setFolder(pin.path);
          setBranch(pin.branch);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [roots]);
  const selected = roots.find((r) => r.full_name === repository);
  const [owner, name] = repository.split("/");
  const target = {
    owner,
    repo: name,
    branch,
    path: folder,
  };
  return (
    <section>
      {directory && <p>{t("folderUploadHelp")}</p>}
      <label>
        {t("destination")}{" "}
        <select
          disabled={!!files}
          value={repository}
          onChange={(e) => {
            setRepository(e.target.value);
            setBranch(
              roots.find((r) => r.full_name === e.target.value)
                ?.default_branch || "main",
            );
          }}
        >
          {roots.map((r) => (
            <option key={r.full_name}>{r.full_name}</option>
          ))}
        </select>
      </label>
      <label>
        {t("destinationFolder")}{" "}
        <input
          disabled={!!files}
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
      </label>
      {!files && !job && (
        <label>
          {t("uploadFiles")}{" "}
          <input
            type="file"
            ref={(node) => {
              if (directory) node?.setAttribute("webkitdirectory", "");
            }}
            multiple
            disabled={!selected}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (directory) {
                try {
                  const items = directoryFiles(files);
                  setJob(
                    () => (choice?: CollisionChoice) =>
                      planFolderUpload(target, items, choice),
                  );
                } catch (error) {
                  setError((error as Error).message);
                }
                return;
              }
              setError("");
              try {
                folderPath(folder);
              } catch {
                setError("destinationInvalid");
                return;
              }
              void request(
                "/repos/" +
                  encodeURIComponent(owner) +
                  "/" +
                  encodeURIComponent(name),
              )
                .then((r) => r.json() as Promise<Repo>)
                .then((repo) => {
                  setRepo(repo);
                  setFiles(files);
                })
                .catch(() => setError("destinationInvalid"));
            }}
          />
        </label>
      )}
      {job && <OperationReview job={job} onClose={onClose} />}
      {files && repo && (
        <GuardReview
          files={files}
          repo={repo}
          onStage={async () => {
            let entries: Entry[];
            try {
              entries = await library.list(target);
            } catch (error) {
              if (
                (error as Error).message !== "NOT_FOUND" &&
                (error as Error).message !== "EMPTY_REPO"
              )
                throw error;
              entries = [];
            }
            await stageUploads(target, files, entries);
            onClose();
          }}
        />
      )}
      {error && <p role="alert">{t(error)}</p>}
    </section>
  );
}
