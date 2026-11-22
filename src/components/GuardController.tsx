import { FolderUpload } from "./FolderUpload";
import { droppedFiles } from "../services/folderUpload";
import { preference } from "../services/preferences";
import { library } from "../services/library";
import { openRead, request } from "../providers/github/client";
import { stageUploads } from "../services/stageUploads";
import { parseRef, type GitRef } from "../lib/refs";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { GuardReview } from "./GuardReview";
import { SizeLedger } from "./GuardViews";
import type { Repo, Entry } from "../services/library";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import {
  githubTransferSource,
  localTransferSource,
  requestTransfer,
} from "../services/transferRequests";
import type { CloudLibrary } from "./cloudTypes";
import type { PdfSplitSource } from "./PdfSplitReview";
import guardStyles from "./Guards.module.css";
import styles from "./Library.module.css";
const SplitReview = lazy(() =>
  import("./PdfSplitReview").then((module) => ({
    default: module.PdfSplitReview,
  })),
);
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
    [ledger, setLedger] = useState(false),
    [split, setSplit] = useState<{ source: PdfSplitSource; staged(): void }>();
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
      const offline = !navigator.onLine;
      const metadata = offline
        ? target.owner + "/" + target.repo === repo.full_name
          ? repo
          : undefined
        : ((await (await request(root)).json()) as Repo);
      if (!metadata) throw Error("offlineMissing");
      const listing = await (
        offline && account
          ? import("../services/githubCache").then((cache) =>
              cache.listGitHub(account, target),
            )
          : library.list(target)
      ).catch((error) => {
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
    const splitPdf = (event: Event) => {
      const file = (event as CustomEvent<Entry>).detail;
      const ref = parseRef(file.ref);
      setTarget({ ...ref, path: ref.path.split("/").slice(0, -1).join("/") });
      setTargetRepo(repo);
      setTargetEntries(entries);
      setSplit({
        source: {
          name: file.name,
          size: file.size,
          read: (signal) =>
            account
              ? import("../services/githubCache").then((cache) =>
                  cache.readGitHub(account, ref, signal),
                )
              : library.read(ref, signal),
        },
        staged: () => {},
      });
    };
    window.addEventListener("shelf-split-pdf", splitPdf);
    window.addEventListener("shelf-ledger", ledger);
    return () => {
      window.removeEventListener("shelf-upload", upload);
      window.removeEventListener("dragover", drop);
      window.removeEventListener("drop", drop);
      window.removeEventListener("shelf-ledger", ledger);
      window.removeEventListener("shelf-split-pdf", splitPdf);
    };
  }, [account, current, entries, repo]);
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
      {(files || ledger || split) && (
        <Modal
          isOpen
          className={
            ledger ? styles.modal + " " + guardStyles.ledgerModal : styles.modal
          }
          onOpenChange={(open) => {
            if (!open) {
              setFiles(undefined);
              setLedger(false);
              setSplit(undefined);
            }
          }}
        >
          <Dialog ref={dialog}>
            <Heading slot="title">
              {t(
                ledger
                  ? "sizeLedger"
                  : split && !files
                    ? "splitPdf"
                    : "guardReview",
              )}
            </Heading>
            <Button
              variant="quiet"
              onPress={() => {
                setFiles(undefined);
                setLedger(false);
                setSplit(undefined);
              }}
            >
              {t(files ? "dontStage" : "close")}
            </Button>
            {split ? (
              <Suspense fallback={<p role="status">{t("splitPdfWorking")}</p>}>
                <SplitReview
                  source={split.source}
                  target={ledger ? current : target}
                  entries={ledger ? entries : targetEntries}
                  repo={ledger ? repo : targetRepo}
                  onClose={() => setSplit(undefined)}
                  onStaged={() => {
                    split.staged();
                    setSplit(undefined);
                  }}
                />
              </Suspense>
            ) : ledger ? (
              <SizeLedger
                repo={repo}
                entries={entries}
                onSplit={(file) =>
                  setSplit({
                    source: {
                      name: file.name,
                      size: file.size,
                      read: async (signal) =>
                        (
                          await openRead(parseRef(file.ref), signal, file.sha)
                        ).blob(),
                    },
                    staged: () => setLedger(false),
                  })
                }
                onMove={
                  account
                    ? (selected) => {
                        requestTransfer({
                          items: selected.map((entry) => ({
                            source: githubTransferSource(account, entry),
                          })),
                          move: true,
                          onStaged: () => setLedger(false),
                        });
                      }
                    : undefined
                }
              />
            ) : (
              <GuardReview
                key={files?.map((f) => f.name + f.size).join("|")}
                files={files || []}
                onSplit={(index) => {
                  const file = files?.[index];
                  if (!file) return;
                  setSplit({
                    source: {
                      name: file.name,
                      size: file.size,
                      read: async () => file,
                    },
                    staged: () => {
                      const remaining = files?.filter(
                        (_, item) => item !== index,
                      );
                      setFiles(remaining?.length ? remaining : undefined);
                    },
                  });
                }}
                remedies={
                  cloud
                    ? (index) => {
                        const file = files?.[index];
                        if (!file) return;
                        const targets = cloud.locations.roots.flatMap(
                          (root) => {
                            if (
                              root.provider === "github" ||
                              root.provider === "local"
                            )
                              return [];
                            const endpoint = {
                              provider: root.provider,
                              locationId: root.id,
                              ref: root.root,
                            };
                            return cloud.transferProvider(endpoint)
                              ? [endpoint]
                              : [];
                          },
                        );
                        return targets.length ? (
                          <div className={guardStyles.remedies}>
                            {targets.map((endpoint) => (
                              <Button
                                key={endpoint.locationId}
                                onPress={() =>
                                  requestTransfer({
                                    items: [localTransferSource(file)],
                                    move: false,
                                    target: endpoint,
                                    cloudOnly: true,
                                    onStaged: () => {
                                      const remaining = files?.filter(
                                        (_, item) => item !== index,
                                      );
                                      setFiles(
                                        remaining?.length
                                          ? remaining
                                          : undefined,
                                      );
                                    },
                                  })
                                }
                              >
                                {t("sendToProvider", {
                                  repo: t(endpoint.provider),
                                })}
                              </Button>
                            ))}
                          </div>
                        ) : undefined;
                      }
                    : undefined
                }
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
