import "../i18n/m3c";
import { useState } from "react";
import { FolderCollisionReview } from "../components/FolderCollisionReview";
import { LinkedChanges } from "../components/LinkedChanges";
import { evaluateFile } from "../services/guards";
import type { Change } from "../services/staging";
import { t } from "../i18n";
export function FolderSpecimens() {
  const [choice, setChoice] = useState("");
  const changes: Change[] = [
    "reading-list.pdf",
    "seminar-notes.md",
    "week-2/outline.txt",
  ].map((path, i) => ({
    id: "sample-folder-" + i,
    groupId: "sample-folder",
    groupLabel: "semester-6",
    kind: "rename",
    target: {
      owner: "ada",
      repo: "sample-notes",
      branch: "main",
      path: "semester-6/" + path,
    },
    oldPath: "semester-5/" + path,
    createdAt: 0,
    size: 0,
    verdict: evaluateFile(0),
  }));
  return (
    <section>
      <h2>
        {t("sample")}: {t("uploadFolder")}
      </h2>
      <p>{t("folderUploadHelp")}</p>
      <LinkedChanges changes={changes} />
      <FolderCollisionReview
        paths={["sample-notes/semester-6"]}
        onChoose={(choice) =>
          setChoice(choice === "both" ? "folderKeepBoth" : "folderReplace")
        }
        onCancel={() => setChoice("workingCancel")}
      />
      {choice && (
        <p role="status">
          {t("sample")}: {t(choice)}
        </p>
      )}
    </section>
  );
}
