import { useState } from "react";
import { t } from "../i18n";
import { Locations } from "../components/Locations";
import { LabelMark } from "../components/LabelMark";
import { FileTable } from "../components/FileTable";
import ExplorerViews, { type ViewData } from "../components/ExplorerViews";
import { DuplicateResults, ToolProgress } from "../components/LibraryTools";
import { itemKey, labelColors, type LibraryItem } from "../services/organizer";
import "../i18n/styleguide";
import styles from "./Styleguide.module.css";

const gitRef = "gh:ada/notes@main/";
function sample(
  name: string,
  provider: "github" | "gdrive",
  kind: "file" | "dir" = "file",
): LibraryItem {
  const ref =
    provider === "github" ? gitRef + encodeURIComponent(name) : "gd:" + name;
  return {
    endpoint: {
      provider,
      ref,
      locationId: provider === "github" ? "ada:ada/notes" : "gdrive:study",
    },
    entry: {
      ref,
      name,
      kind,
      size: null,
      version: "sample",
      hash: null,
      modified: null,
    },
  };
}

const reading = sample("reading.pdf", "github");
const copy = sample("reading-copy.pdf", "gdrive");
const folder = sample("Week 1", "github", "dir");
const duplicate = [{ digest: "illustration", items: [reading, copy] }];
const sampleCollection = [reading, copy];
const gallery: ViewData = {
  rows: [folder, reading, copy, sample("notes.md", "github")],
  location: "specimen",
  list: async () => [reading, sample("checklist.txt", "github")],
  resolve: async () => {
    throw Error("sample");
  },
  onSelect: () => {},
  onOpen: () => {},
  onPreview: () => {},
  mixed: true,
};

export function OrganizationSpecimens() {
  const [active, setActive] = useState("study");
  const [selected, setSelected] = useState(() => new Set([itemKey(copy)]));
  return (
    <section id="organization-specimens" className={styles.section}>
      <h2>{t("collections")}</h2>
      <Locations
        repos={[]}
        virtual={{
          active,
          collections: [
            {
              id: "study",
              name: t("sampleCollection"),
              color: "teal",
              items: sampleCollection,
            },
          ],
          tags: [
            {
              id: "reading",
              name: t("sampleTag"),
              color: "pink",
              items: [reading],
            },
          ],
          open: setActive,
          create: () => {},
          add: () => {},
          exportLabels: () => {},
        }}
      />
      <FileTable
        mixed
        entries={sampleCollection.map(({ entry }) => ({
          ...entry,
          size: entry.size ?? 0,
          sha: entry.version ?? "",
          path: entry.name,
        }))}
        reference={(entry) =>
          sampleCollection.find((item) => item.entry.ref === entry.ref)
        }
        onOpen={() => {}}
        onPreview={() => {}}
      />
      <h3>{t("tags")}</h3>
      <ul className={styles.inline}>
        {labelColors.map((color) => (
          <li key={color}>
            <LabelMark color={color} />
            {t("label_" + color)}
          </li>
        ))}
      </ul>
      <h3>{t("viewGrid")}</h3>
      <ExplorerViews view="viewGrid" data={gallery} />
      <h3>{t("viewColumns")}</h3>
      <ExplorerViews view="viewColumns" data={gallery} />
      <h3>{t("duplicateTitle")}</h3>
      <DuplicateResults
        groups={duplicate}
        selected={selected}
        onChange={setSelected}
      />
      <h3>{t("exportSelection")}</h3>
      <ToolProgress
        label={t("zipWriting")}
        progress={{ done: 34, total: 100 }}
      />
    </section>
  );
}
