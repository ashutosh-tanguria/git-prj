import { FolderUpload } from "./FolderUpload";
import { droppedFiles } from "../services/folderUpload";
import { preference } from "../services/preferences";
import { library } from "../services/library";
import { request } from "../providers/github/client";
import { stageUploads } from "../services/stageUploads";
import type { GitRef } from "../lib/refs";
import { useEffect, useRef, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { GuardReview } from "./GuardReview";
import { SizeLedger } from "./GuardViews";
import type { Repo, Entry } from "../services/library";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { githubTransferSource, localTransferSource, requestTransfer } from "../services/transferRequests";
import type { CloudLibrary } from "./cloudTypes";
import guardStyles from "./Guards.module.css";
import styles from "./Library.module.css";
export function GuardController({
  repo,
  entries,
  current,
  account,
  cloud,
}: {
  repo: Repo;
  entries: Entry[];
  current: GitRef;
  account?: string;
  cloud?: CloudLibrary;
}) {
  const [files, setFiles] = useState<File[]>(),
    [target, setTarget] = useState(current),
    [targetRepo, setTargetRepo] = useState(repo),
    [targetEntries, setTargetEntries] = useState(entries),
    [error, setError] = useState(""),
    [ledger, setLedger] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLElement>(null);
  const chooseFiles = async (files: File[]) => {
    setError("");
    try {
      const target = await preference("pinnedDestination", current);
      const root =
        "/repos/" +
        encodeURIComponent(target.owner) +
        "/" +
        encodeURIComponent(target.repo);
      const metadata = (await (await request(root)).json()) as Repo;
      const listing = await library.list(target).catch((error) => {
        if (["NOT_FOUND", "EMPTY_REPO"].includes((error as Error).message))
          return [];
        throw error;
      });
      setTarget(target);
      setTargetRepo(metadata);
      setTargetEntries(listing);
      setFiles(files);
    } catch {
      setError("workingError");
    }
  };
  useEffect(() => {
    const drop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        if (e.type === "drop")
          void droppedFiles(e.dataTransfer)
            .then((result) => {
              if (result.folders)
                window.dispatchEvent(
                  new CustomEvent("shelf-folder-items", {
                    detail: result.items,
                  }),
                );
              else
                void chooseFiles(result.items.map((item) => item.blob as File));
            })
            .catch((error) => setError((error as Error).message));
      }
    };
    const upload = () => input.current?.click();
    window.addEventListener("shelf-upload", upload);
    const ledger = () => setLedger(true);
    window.addEventListener("dragover", drop);
    window.addEventListener("drop", drop);
    window.addEventListener("shelf-ledger", ledger);
    return () => {
      window.removeEventListener("shelf-upload", upload);
      window.removeEventListener("dragover", drop);
      window.removeEventListener("drop", drop);
      window.removeEventListener("shelf-ledger", ledger);
    };
  }, [current, entries, repo]);
  useEffect(() => {
    if (files || ledger) requestAnimationFrame(() => dialog.current?.focus());
  }, [files, ledger]);
  return (
    <>
      <FolderUpload current={current} />
      {error && <p role="alert">{t(error)}</p>}
      <input
        ref={input}
        hidden
        aria-label={t("uploadFiles")}
        type="file"
        multiple
        onChange={(e) => {
          void chooseFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {(files || ledger) && (
        <Modal
          isOpen
          className={
            ledger ? styles.modal + " " + guardStyles.ledgerModal : styles.modal
          }
          onOpenChange={(open) => {
            if (!open) {
              setFiles(undefined);
              setLedger(false);
            }
          }}
        >
          <Dialog ref={dialog}>
            <Heading slot="title">
              {t(ledger ? "sizeLedger" : "guardReview")}
            </Heading>
            <Button
              variant="quiet"
              onPress={() => {
                setFiles(undefined);
                setLedger(false);
              }}
            >
              {t(files ? "dontStage" : "close")}
            </Button>
            {ledger ? (
              <SizeLedger repo={repo} entries={entries}
                onMove={account ? (selected) => {
                  requestTransfer({ items: selected.map((entry) => ({ source: githubTransferSource(account, entry) })),
                    move: true, onStaged: () => setLedger(false) });
                } : undefined} />
            ) : (
              <GuardReview
                key={files?.map((f) => f.name + f.size).join("|")}
                files={files || []}
                remedies={cloud ? (index) => {
                  const file = files?.[index];
                  if (!file) return;
                  const targets = cloud.locations.roots.flatMap((root) => {
                    if (root.provider === "github" || root.provider === "local") return [];
                    const endpoint = { provider: root.provider, locationId: root.id, ref: root.root };
                    return cloud.transferProvider(endpoint) ? [endpoint] : [];
                  });
                  return targets.length ? <div className={guardStyles.remedies}>
                    {targets.map((endpoint) => (
                      <Button key={endpoint.locationId} onPress={() => requestTransfer({
                        items: [localTransferSource(file)], move: false, target: endpoint, cloudOnly: true,
                        onStaged: () => {
                          const remaining = files?.filter((_, item) => item !== index);
                          setFiles(remaining?.length ? remaining : undefined);
                        },
                      })}>{t("sendToProvider", { repo: t(endpoint.provider) })}</Button>
                    ))}
                  </div> : undefined;
                } : undefined}
                onStage={async () => {
                  await stageUploads(target, files || [], targetEntries);
                  setFiles(undefined);
                }}
                repo={targetRepo}
              />
            )}
          </Dialog>
        </Modal>
      )}
    </>
  );
}
