import { useEffect, useRef, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { GuardReview } from "./GuardReview";
import { SizeLedger } from "./GuardViews";
import type { Repo, Entry } from "../services/library";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import guardStyles from "./Guards.module.css";
import styles from "./Library.module.css";
export function GuardController({
  repo,
  entries,
}: {
  repo: Repo;
  entries: Entry[];
}) {
  const [files, setFiles] = useState<File[]>(),
    [ledger, setLedger] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "u" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.target as HTMLElement).closest('[role="grid"]') &&
        !(e.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"]',
        )
      ) {
        e.preventDefault();
        input.current?.click();
      }
    };
    const drop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        if (e.type === "drop") setFiles(Array.from(e.dataTransfer.files));
      }
    };
    const ledger = () => setLedger(true);
    window.addEventListener("keydown", key);
    window.addEventListener("dragover", drop);
    window.addEventListener("drop", drop);
    window.addEventListener("shelf-ledger", ledger);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("dragover", drop);
      window.removeEventListener("drop", drop);
      window.removeEventListener("shelf-ledger", ledger);
    };
  }, []);
  useEffect(() => {
    if (files || ledger) requestAnimationFrame(() => dialog.current?.focus());
  }, [files, ledger]);
  return (
    <>
      <input
        ref={input}
        hidden
        aria-label={t("uploadFiles")}
        type="file"
        multiple
        onChange={(e) => {
          setFiles(Array.from(e.target.files || []));
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
              <SizeLedger repo={repo} entries={entries} />
            ) : (
              <GuardReview
                key={files?.map((f) => f.name + f.size).join("|")}
                files={files || []}
                repo={repo}
              />
            )}
          </Dialog>
        </Modal>
      )}
    </>
  );
}
