import { ConnectPanel } from "../components/ConnectPanel";
import { useState } from "react";
import { QuickLook } from "../components/QuickLook";
import { Button } from "../ui/Button";
import { ReadViewer } from "../viewers/ReadViewer";
import { Locations } from "../components/Locations";
import { FileTable } from "../components/FileTable";
import { AddressBar } from "../components/AddressBar";
import { GuardStrip, StatusBar, PendingTray } from "../components/ReadChrome";
import { t } from "../i18n";
export function ReadStyleguide() {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h2>{t("sample")}</h2>
      <AddressBar value="gh:ada/notes@main/" onGo={() => {}} />
      <ConnectPanel
        token=""
        onToken={() => {}}
        onConnect={() => {}}
        loading={false}
      />
      <Locations
        repos={[
          { full_name: "ada/notes", default_branch: "main", private: true },
        ]}
      />
      <FileTable
        entries={[
          {
            name: "distributed-systems.pdf",
            path: "distributed-systems.pdf",
            sha: "sample",
            size: 14680064,
            kind: "file",
            ref: "gh:ada/notes@main/distributed-systems.pdf",
          },
        ]}
        onOpen={() => {}}
        onPreview={() => {}}
      />
      <PendingTray />
      <GuardStrip />
      <StatusBar account="ada (sample)" />
      <ReadViewer
        blob={new Blob(["Sample reading notes"], { type: "text/plain" })}
        name="reading-notes.txt"
      />
      <Button onPress={() => setOpen(true)}>{t("quickLook")}</Button>
      {open && (
        <QuickLook title={t("sample")} onClose={() => setOpen(false)}>
          <p>{t("sample")}</p>
        </QuickLook>
      )}
    </section>
  );
}
