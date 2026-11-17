import styles from "./FolderOps.module.css";
import "../i18n/m3c";
import type { Change } from "../services/staging";
import { t } from "../i18n";
export function LinkedChanges({ changes }: { changes: Change[] }) {
  return (
    <>
      <p>
        {t(
          "workingKind" +
            (changes.find((c) => c.kind !== "delete") || changes[0]).kind,
        )}
        : {changes[0].groupLabel} (
        {t("folderGroup", {
          count: changes.filter((c) => !c.treeDelete).length,
        })}
        )
      </p>
      {[
        ...new Map(changes.map((c) => [c.verdict.code, c.verdict])).values(),
      ].map((v) => (
        <span key={v.code} data-verdict={v.level}>
          {t(v.code)}
        </span>
      ))}
      <details>
        <summary>{t("folderFileDetails")}</summary>
        <ul className={styles.paths}>
          {changes.map((c) => (
            <li key={c.id}>
              {t("workingKind" + c.kind)}: {c.oldPath && <>{c.oldPath} / </>}
              {c.target.path}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
