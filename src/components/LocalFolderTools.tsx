import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import type { Entry } from "../services/library";
import {
  localTransferSource,
  githubTransferSource,
  requestTransfer,
} from "../services/transferRequests";
import type { TransferSource } from "../services/transferTypes";
import {
  directoryPicker,
  exportLocalDirectory,
  exportLocalZip,
  exportSources,
  filesFromDirectoryInput,
  readLocalDirectory,
  type LocalFile,
} from "../services/localFolder";
import { useTransferAccess, type TransferAccess } from "./useTransferAccess";
import { transferMessage } from "./TransferPicker";
import "../i18n/transfers";

export default function LocalFolderTools(
  props: TransferAccess & { selection: Entry[] },
) {
  const { resolve } = useTransferAccess(props);
  const [status, setStatus] = useState("");
  const [failure, setFailure] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const directoryInput = useCallback((element: HTMLInputElement | null) => {
    input.current = element;
    element?.setAttribute("webkitdirectory", "");
  }, []);
  const busy = useRef(false);
  const handlers = useRef<{
    runImport(): void;
    runExport(items?: TransferSource[]): void;
  }>({
    runImport: () => {},
    runExport: () => {},
  });
  const prepare = (files: LocalFile[]) => {
    requestTransfer({
      move: false,
      items: files.map(({ file, path }) => localTransferSource(file, path)),
      onStaged: () => setStatus(""),
    });
    setStatus(t("localImportReady"));
  };
  async function run(work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setStatus("");
    setFailure("");
    try {
      await work();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setFailure(transferMessage(error));
    } finally {
      busy.current = false;
    }
  }
  handlers.current = {
    runImport: () =>
      void run(async () => {
        const picker = directoryPicker();
        if (picker) {
          const directory = await picker({ mode: "read" });
          setStatus(t("localImportReading"));
          prepare(await readLocalDirectory(directory));
        } else if (input.current && "webkitdirectory" in input.current) {
          setStatus(t("localImportFallback"));
          input.current.click();
        } else throw Error("localImportUnsupported");
      }),
    runExport: (options) =>
      void run(async () => {
        const files = exportSources(
          options ??
            (props.cloud?.active
              ? props.cloud.transferSelection
              : props.selection.map((entry) =>
                  githubTransferSource(props.account, entry),
                )),
        );
        const picker = directoryPicker();
        if (picker) {
          const directory = await picker({ mode: "readwrite" });
          setStatus(t("localExportWriting"));
          await exportLocalDirectory(directory, files, resolve);
          setStatus(t("localExportDone"));
        } else {
          setStatus(t("localExportFallback"));
          const zip = await exportLocalZip(files, resolve);
          const url = URL.createObjectURL(zip);
          const link = document.createElement("a");
          link.href = url;
          link.download = "shelf-files.zip";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          setStatus(t("localExportZipDone"));
        }
      }),
  };
  useEffect(() => {
    const command = (event: Event) => {
      const { action } = (event as CustomEvent<{ action: string }>).detail;
      if (action === "localImport") handlers.current.runImport();
      if (action === "localExport") handlers.current.runExport();
    };
    const exportSelection = (event: Event) =>
      handlers.current.runExport(
        (event as CustomEvent<TransferSource[]>).detail,
      );
    window.addEventListener("shelf-command", command);
    window.addEventListener("shelf-local-export", exportSelection);
    return () => {
      window.removeEventListener("shelf-command", command);
      window.removeEventListener("shelf-local-export", exportSelection);
    };
  }, []);
  return (
    <>
      <input
        type="file"
        hidden
        ref={directoryInput}
        multiple
        aria-label={t("localImport")}
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length)
            void run(async () => prepare(filesFromDirectoryInput(files)));
          event.target.value = "";
        }}
      />
      {status && <p role="status">{status}</p>}
      {failure && <p role="alert">{failure}</p>}
    </>
  );
}
