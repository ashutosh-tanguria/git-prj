import type { CollisionChoice } from "../services/folderTypes";
import "../i18n/m3c";
import { useEffect, useRef, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { OperationReview, type OperationJob } from "./OperationReview";
import { directoryFiles, FOLDER_UPLOAD_CAP } from "../services/folderUpload";
import {
  planFolderUpload,
  type UploadItem,
} from "../services/folderOperations";
import { preference } from "../services/preferences";
import type { GitRef } from "../lib/refs";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function FolderUpload({ current }: { current: GitRef }) {
  const input = useRef<HTMLInputElement>(null),
    [job, setJob] = useState<OperationJob>(),
    [error, setError] = useState("");
  const choose = async (items: UploadItem[]) => {
    if (items.length > FOLDER_UPLOAD_CAP) {
      setJob(undefined);
      setError("folderUploadCap");
      return;
    }
    const target = await preference("pinnedDestination", current);
    setError("");
    setJob(
      () => (choice?: CollisionChoice) =>
        planFolderUpload(target, items, choice),
    );
  };
  useEffect(() => {
    input.current?.setAttribute("webkitdirectory", "");
    const open = () => input.current?.click();
    const dropped = (e: Event) => {
      void choose((e as CustomEvent<UploadItem[]>).detail);
    };
    window.addEventListener("shelf-upload-folder", open);
    window.addEventListener("shelf-folder-items", dropped);
    return () => {
      window.removeEventListener("shelf-upload-folder", open);
      window.removeEventListener("shelf-folder-items", dropped);
    };
  }, [current]);
  return (
    <>
      <input
        hidden
        ref={input}
        type="file"
        multiple
        aria-label={t("uploadFolder")}
        onChange={(e) => {
          try {
            void choose(directoryFiles(Array.from(e.target.files || [])));
          } catch (error) {
            setError((error as Error).message);
          }
          e.target.value = "";
        }}
      />
      {error && <p role="alert">{t(error)}</p>}
      {job && (
        <Modal
          isOpen
          className={styles.workingPanel}
          onOpenChange={(open) => {
            if (!open) setJob(undefined);
          }}
        >
          <Dialog>
            <Heading slot="title">{t("uploadFolder")}</Heading>
            <p>{t("folderUploadHelp")}</p>
            <OperationReview job={job} onClose={() => setJob(undefined)} />
            <Button onPress={() => setJob(undefined)}>
              {t("workingCancel")}
            </Button>
          </Dialog>
        </Modal>
      )}
    </>
  );
}
