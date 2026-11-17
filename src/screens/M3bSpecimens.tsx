import "../i18n/m3b";
import { useState } from "react";
import { HomeUpload } from "../components/HomeUpload";
import { CreateRepository } from "../components/CreateRepository";
import { DestinationEditor } from "../components/DestinationEditor";
import { ShortcutSettings } from "../components/ShortcutSettings";
import { QuickPush } from "../components/QuickPush";
import { defaultShortcuts } from "../services/shortcuts";
import { evaluateFile } from "../services/guards";
import { Button } from "../ui/Button";
import type { Change } from "../services/staging";
import { t } from "../i18n";
import styles from "../components/Library.module.css";
const repo = {
  full_name: "ada/sample-notes",
  private: true,
  default_branch: "main",
  size: 1,
};
const rows: Change[] = [
  {
    id: "sample",
    target: {
      owner: "ada",
      repo: "sample-notes",
      branch: "main",
      path: "semester-5/sample.pdf",
    },
    kind: "add",
    size: 42,
    createdAt: 0,
    verdict: evaluateFile(42),
  },
];
const source = { roots: async () => [repo], list: async () => [] };
const api = {
  repositoryOwners: async () => ({
    user: "ada",
    owners: ["ada", "sample-study-group"],
  }),
  repositoryAvailable: async (_owner: string, name: string) =>
    name !== "sample-taken",
  createRepository: async () => {
    throw Error("PERMISSION");
  },
};
export function M3bSpecimens() {
  const [open, setOpen] = useState(""),
    [message, setMessage] = useState("Add sample.pdf");
  return (
    <section className={styles.specimenPanel}>
      <h2>
        {t("sample")}: {t("repoCreate")}, {t("destination")},{" "}
        {t("commandSettings")}
      </h2>
      <p>{t("sample")}</p>
      <Button onPress={() => setOpen("repo")}>{t("repoCreate")}</Button>
      <Button onPress={() => setOpen("quick")}>{t("quickPush")}</Button>
      {open === "repo" && (
        <CreateRepository
          api={api}
          onCreated={() => {}}
          onClose={() => setOpen("")}
          onRefresh={async () => {}}
        />
      )}
      {open === "quick" && (
        <QuickPush
          rows={rows}
          message={message}
          onMessage={setMessage}
          onPush={() => {}}
          onClose={() => setOpen("")}
          onChange={() => setOpen("")}
          busy={false}
          anchor={new DOMRect(160, 160, 80, 28)}
        />
      )}
      <DestinationEditor rows={rows} source={source} onApply={async () => {}} />
      <HomeUpload roots={[]} onClose={() => {}} />
      <ShortcutSettings bindings={defaultShortcuts} onSave={() => {}} />
    </section>
  );
}
