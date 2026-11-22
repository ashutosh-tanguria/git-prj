import { t } from "../i18n";
import "../i18n/transfers";
import { TransferRow } from "../components/TransferReview";
import type { Transfer, TransferState } from "../services/transferTypes";
import { Button } from "../ui/Button";
import { ProviderMark } from "../ui/ProviderMark";
import styles from "./Styleguide.module.css";
import split from "../components/SplitWorkspace.module.css";

const specimen: Transfer = {
  id: "transfer-sample",
  source: {
    endpoint: {
      provider: "github",
      locationId: "sample:ada/notes",
      ref: "gh:ada/notes@main/chapter.pdf",
    },
    entry: {
      kind: "file",
      name: "chapter.pdf",
      ref: "gh:ada/notes@main/chapter.pdf",
      size: 60,
      modified: null,
      hash: "sample",
      version: "sample",
    },
  },
  target: { provider: "gdrive", locationId: "gdrive:sample", ref: "gd:root" },
  name: "chapter.pdf",
  size: 60,
  move: true,
  createdAt: 0,
  state: "staged",
};
const states: TransferState[] = [
  "staged",
  "reading",
  "writing",
  "verifying",
  "verified",
  "deleting",
  "done",
  "failed",
  "cancelled",
];
export function TransferSpecimens() {
  return (
    <section id="transfer-specimens" className={styles.section}>
      <h2>{t("transferReview")}</h2>
      <ul>
        {states.map((state) => (
          <TransferRow
            key={state}
            row={{
              ...specimen,
              state,
              error: state === "failed" ? "transferNotVerified" : undefined,
            }}
            bytes={
              state === "reading"
                ? 22
                : state === "writing"
                  ? 36
                  : state === "verifying"
                    ? 50
                    : undefined
            }
          >
            {state === "failed" && (
              <Button isDisabled>{t("transferRetry")}</Button>
            )}
            {state === "writing" && <Button isDisabled>{t("cancel")}</Button>}
          </TransferRow>
        ))}
      </ul>
      <h3>{t("splitView")}</h3>
      <div className={split.split}>
        <section className={split.pane}>
          <h4>{t("splitLeft")}</h4>
          <ProviderMark provider="github" label={t("github")} />
          <p className={split.path}>ada/notes · main/notes</p>
          <ul className={split.files}>
            <li>chapter.pdf</li>
          </ul>
          <div className={split.actions}>
            <Button isDisabled>{t("moveTo")}</Button>
            <Button isDisabled>{t("copyTo")}</Button>
          </div>
        </section>
        <section className={split.pane}>
          <h4>{t("splitRight")}</h4>
          <ProviderMark provider="gdrive" label={t("gdrive")} />
          <p className={split.path}>/Coursework</p>
          <ul className={split.files} data-view="grid">
            <li>reading-notes.txt</li>
          </ul>
        </section>
      </div>
      <h3>{t("connectLocal")}</h3>
      <Button isDisabled>{t("localImport")}</Button>
      <p>{t("localImportReading")}</p>
      <p>{t("localImportFallback")}</p>
      <p>{t("localImportUnsupported")}</p>
      <Button isDisabled>{t("localExport")}</Button>
      <p>{t("localExportWriting")}</p>
      <p>{t("localExportFallback")}</p>
      <p>{t("localExportDone")}</p>
    </section>
  );
}
