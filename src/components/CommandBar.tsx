import { t } from "../i18n";
import { useId } from "react";
import styles from "./ExplorerV2.module.css";
export function LaterAction({
  action,
  milestone = "M3",
  icon = "M3 8h10M8 3v10",
}: {
  action: string;
  milestone?: string;
  icon?: string;
}) {
  const reason = t("availableAfter") + " " + milestone;
  const id = useId();
  return (
    <span
      className={styles.later}
      tabIndex={0}
      role="button"
      aria-disabled="true"
      aria-label={t(action) + ": " + reason}
    >
      <button disabled aria-describedby={id}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d={icon} />
        </svg>
        <span>{t(action)}</span>
      </button>
      <span role="tooltip" id={id}>
        {reason}
      </span>
    </span>
  );
}
export function CommandBar() {
  return (
    <nav className={styles.command} aria-label={t("commandBar")}>
      <div className={styles.desktop}>
        <CommandActions />
      </div>
      <details className={styles.overflow}>
        <summary aria-label={t("commandBar")}>...</summary>
        <div>
          <CommandActions />
        </div>
      </details>
    </nav>
  );
}
function CommandActions() {
  return (
    <>
      <div>
        <LaterAction action="newFolder" />
        <LaterAction
          action="uploadFiles"
          icon="M8 12V2m-4 4 4-4 4 4M2 11v3h12v-3"
        />
        <LaterAction action="newRepository" />
      </div>
      <div>
        <LaterAction action="cut" icon="m3 2 10 12M13 2 3 14M2 9h4v5H2Z" />
        <LaterAction action="copy" icon="M6 6h8v8H6ZM2 10V2h8" />
        <LaterAction action="paste" icon="M5 3H2v11h12V3h-3M5 2h6v3H5Z" />
        <LaterAction action="rename" />
        <LaterAction action="delete" icon="M2 4h12M5 4V2h6v2M4 4v10h8V4" />
      </div>
      <div>
        <button
          className={styles.sort}
          onClick={() => document.getElementById("sort-options")?.focus()}
        >
          {t("sortMenu")}
        </button>
        <LaterAction
          action="viewMenu"
          milestone="M5"
          icon="M2 2h12v12H2ZM2 6h12M6 6v8"
        />
      </div>
      <div className={styles.push}>
        <LaterAction action="push" icon="M8 13V3m-4 4 4-4 4 4" />
      </div>
    </>
  );
}
