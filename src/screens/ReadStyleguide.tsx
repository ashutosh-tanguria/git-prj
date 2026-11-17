import { SampleViewers } from "./SampleViewers";
import { CommandBar } from "../components/CommandBar";
import { PaneLayer } from "../components/PaneLayer";
import { Inspector } from "../components/Inspector";
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
  const [panel, setPanel] = useState<"locations" | "inspector" | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h2>{t("sample")}</h2>
      <CommandBar />
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
            modified: "2026-11-15T08:00:00Z",
            lastChange: "Sample: add reading notes",
            size: 14680064,
            kind: "file",
            ref: "gh:ada/notes@main/distributed-systems.pdf",
          },
        ]}
        onOpen={() => {}}
        onPreview={() => {}}
      />
      <Inspector entries={[]} visibility={t("unknown")} />
      <Inspector
        defaultTab="details"
        entries={[
          {
            name: "distributed-systems.pdf",
            path: "distributed-systems.pdf",
            sha: "sample",
            size: 14680064,
            kind: "file",
            ref: "gh:ada/notes@main/distributed-systems.pdf",
            modified: "2026-11-15T08:00:00Z",
            lastChange: "Sample: add reading notes",
          },
        ]}
        visibility={t("private")}
      />
      <Inspector
        defaultTab="details"
        entries={[
          {
            name: "distributed-systems.pdf",
            path: "distributed-systems.pdf",
            sha: "sample",
            size: 14680064,
            kind: "file",
            ref: "gh:ada/notes@main/distributed-systems.pdf",
          },
          {
            name: "reading-notes.md",
            path: "reading-notes.md",
            sha: "sample-md",
            size: 1024,
            kind: "file",
            ref: "gh:ada/notes@main/reading-notes.md",
          },
        ]}
        visibility={t("private")}
      />
      <Button onPress={() => setPanel("locations")}>
        {t("openLocations")}
      </Button>
      <Button onPress={() => setPanel("inspector")}>{t("inspector")}</Button>
      {panel && (
        <PaneLayer kind={panel} onClose={() => setPanel(null)}>
          {panel === "locations" ? (
            <Locations repos={[]} />
          ) : (
            <Inspector entries={[]} visibility={t("unknown")} />
          )}
        </PaneLayer>
      )}
      <SampleViewers />
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
