import { FolderSpecimens } from "./FolderSpecimens";
import { PreviewSpecimens } from "./PreviewSpecimens";
import { M3bSpecimens } from "./M3bSpecimens";
import "../i18n/working";
import { WorkingConflict } from "../components/WorkingConflict";
import { GuardReview } from "../components/GuardReview";
import { SizeLedger } from "../components/GuardViews";
import { SampleViewers } from "./SampleViewers";
import { ActionIcon } from "../ui/ActionIcon";
import { Sash } from "../components/Sash";
import { CommandBar } from "../components/CommandBar";
import { ViewMenu, type FileView } from "../components/ViewMenu";
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
  const [sampleWidth, setSampleWidth] = useState(220);
  const [panel, setPanel] = useState<"locations" | "inspector" | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<FileView>("viewList");
  return (
    <section>
      <h2>{t("sample")}</h2>
      <PreviewSpecimens />
      <CommandBar viewMenu={<ViewMenu active={view} onChange={setView} />} />
      <div style={{ display: "flex", height: 80 }}>
        <Sash
          label={t("locationsWidth")}
          value={sampleWidth}
          min={160}
          max={360}
          initial={220}
          onChange={setSampleWidth}
          onCollapse={() => setSampleWidth(220)}
        />
      </div>
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
      <ActionIcon
        name="locations"
        label={t("openLocations")}
        aria-pressed={panel === "locations"}
        onPress={() => setPanel("locations")}
      />
      <ActionIcon
        name="inspector"
        label={t("inspector")}
        aria-pressed={panel === "inspector"}
        onPress={() => setPanel("inspector")}
      />
      {panel && (
        <PaneLayer kind={panel} onClose={() => setPanel(null)}>
          {panel === "locations" ? (
            <Locations repos={[]} />
          ) : (
            <Inspector entries={[]} visibility={t("unknown")} />
          )}
        </PaneLayer>
      )}
      <section>
        <h2>{t("sample")}</h2>
        {[14, 30, 70, 150].map((size) => (
          <GuardReview
            key={size}
            files={[{ name: "sample-passport.pdf", size: size * 1048576 }]}
            repo={{
              full_name: "ada/sample-notes",
              private: false,
              default_branch: "main",
              size: 612 * 1024,
            }}
          />
        ))}
        <SizeLedger
          repo={{
            full_name: "ada/sample-notes",
            private: true,
            default_branch: "main",
            size: 612 * 1024,
          }}
          entries={[]}
        />
      </section>
      {[1024 * 1024, 5 * 1024 * 1024].map((size) => (
        <GuardReview
          key={size}
          files={[]}
          repo={{
            full_name: "ada/sample-size-warning",
            private: true,
            default_branch: "main",
            size,
          }}
        />
      ))}
      <WorkingConflict paths={["sample-week3.pdf"]} onClose={() => {}} />
      <M3bSpecimens />
      <FolderSpecimens />
      <SampleViewers />
      <PendingTray />
      {[undefined, 0, 500 * 1024, 1024 * 1024].map((size, i) => (
        <GuardStrip
          key={i}
          repo={
            i === 0
              ? undefined
              : {
                  full_name: "ada/sample-notes",
                  private: true,
                  default_branch: "main",
                  size,
                }
          }
        />
      ))}
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
