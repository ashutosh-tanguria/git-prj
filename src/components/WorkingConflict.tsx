import { Button } from "../ui/Button";
import { useState } from "react";
import { staging } from "../services/workingStorage";
import { request } from "../providers/github/client";
import { viewerRoute } from "../lib/refs";
import { t } from "../i18n";
export function WorkingConflict({
  paths,
  onClose,
}: {
  paths: string[];
  onClose: () => void;
}) {
  const [choice, setChoice] = useState(""),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(false);
  const resolve = async () => {
    try {
      const rows = staging.snapshot(),
        next = [];
      for (const row of rows) {
        if (!paths.includes(row.target.path)) {
          next.push(row);
          continue;
        }
        if (choice === "theirs") continue;
        const path = row.oldPath || row.target.path;
        const res = await request(
          "/repos/" +
            encodeURIComponent(row.target.owner) +
            "/" +
            encodeURIComponent(row.target.repo) +
            "/contents/" +
            path.split("/").map(encodeURIComponent).join("/") +
            "?ref=" +
            encodeURIComponent(row.target.branch),
        );
        const remote = (await res.json()) as { sha: string };
        if (choice === "mine")
          next.push({
            ...row,
            baseVersion: remote.sha,
            kind: row.kind === "add" ? ("modify" as const) : row.kind,
          });
        else {
          if (!row.blobKey) throw Error("workingMissing");
          const dot = row.target.path.lastIndexOf("."),
            newPath =
              dot > row.target.path.lastIndexOf("/")
                ? row.target.path.slice(0, dot) +
                  " (shelf copy)" +
                  row.target.path.slice(dot)
                : row.target.path + " (shelf copy)";
          next.push({
            ...row,
            target: { ...row.target, path: newPath },
            kind: "add" as const,
            baseVersion: undefined,
            oldPath: undefined,
          });
        }
      }
      await staging.restore(next);
      onClose();
    } catch {
      setError(true);
    }
  };
  return (
    <fieldset>
      <legend>{t("workingConflict")}</legend>
      {paths.map((path) => (
        <p key={path}>{path}</p>
      ))}
      {["theirs", "mine", "both"].map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="conflict-choice"
            checked={choice === value}
            onChange={() => {
              setChoice(value);
              setConfirm(false);
            }}
          />
          {t(
            value === "theirs"
              ? "workingTheirs"
              : value === "mine"
                ? "workingMine"
                : "workingBoth",
          )}
        </label>
      ))}
      {choice === "mine" && (
        <label>
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          {t("workingOverwrite")}
        </label>
      )}
      <Button
        onPress={() => {
          const row = staging
            .snapshot()
            .find((c) => paths.includes(c.target.path));
          if (row) location.hash = viewerRoute(row.target);
        }}
      >
        {t("workingOpen")}
      </Button>
      <Button
        isDisabled={!choice || (choice === "mine" && !confirm)}
        onPress={() => void resolve()}
      >
        {t("workingContinue")}
      </Button>
      {error && <p role="alert">{t("workingError")}</p>}
    </fieldset>
  );
}
