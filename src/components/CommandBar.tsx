import { useState, useRef, useId } from "react";
import { iconPaths } from "../ui/ActionIcon";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { createPortal } from "react-dom";
import styles from "./ExplorerV2.module.css";
export function LaterAction({
  action,
  milestone = "M3",
  icon,
}: {
  action: string;
  milestone?: string;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const id = useId();
  const rect = anchor.current?.getBoundingClientRect();
  const reason = t("availableAfter") + " " + milestone;
  return (
    <span
      ref={anchor}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={(e) => {
        if (e.target.matches(":focus-visible")) setOpen(true);
      }}
      onBlurCapture={() => setOpen(false)}
      onKeyDownCapture={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Button
        data-later="true"
        data-action={action}
        aria-disabled="true"
        aria-describedby={open ? id : undefined}
        aria-label={
          t(action) + (action === "pending" ? " 0" : "") + ": " + reason
        }
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d={icon || iconPaths[action] || "M3 8h10M8 3v10"} />
        </svg>
        <span>{t(action)}</span>
        {action === "pending" && (
          <>
            {" "}
            <span className={styles.count}>0</span>
          </>
        )}
      </Button>
      {open &&
        rect &&
        createPortal(
          <div
            className={styles.disabledTooltip}
            role="tooltip"
            id={id}
            style={{
              left: Math.max(4, Math.min(rect.left, innerWidth - 240)),
              top: rect.bottom + 4,
            }}
          >
            {reason}
          </div>,
          document.body,
        )}
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
export function CommandAction({
  action,
  icon,
}: {
  action: string;
  icon?: string;
}) {
  return (
    <Button
      data-action={action}
      onPress={() =>
        window.dispatchEvent(
          new CustomEvent("shelf-command", { detail: { action } }),
        )
      }
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d={icon || iconPaths[action] || "M3 8h10M8 3v10"} />
      </svg>
      <span>{t(action)}</span>
    </Button>
  );
}
function CommandActions() {
  return (
    <>
      <div>
        <CommandAction action="newFolder" />
        <CommandAction
          action="uploadFiles"
          icon="M8 12V2m-4 4 4-4 4 4M2 11v3h12v-3"
        />
        <CommandAction action="newRepository" />
      </div>
      <div>
        <CommandAction action="cut" icon="m3 2 10 12M13 2 3 14M2 9h4v5H2Z" />
        <CommandAction action="copy" icon="M6 6h8v8H6ZM2 10V2h8" />
        <CommandAction action="paste" icon="M5 3H2v11h12V3h-3M5 2h6v3H5Z" />
        <CommandAction action="rename" />
        <CommandAction action="delete" icon="M2 4h12M5 4V2h6v2M4 4v10h8V4" />
      </div>
      <div>
        <button
          className={styles.sort}
          onClick={() => document.getElementById("sort-options")?.focus()}
        >
          {t("sortMenu")}
        </button>
        <CommandAction action="settings" />
        <LaterAction
          action="viewMenu"
          milestone="M5"
          icon="M2 2h12v12H2ZM2 6h12M6 6v8"
        />
      </div>
      <div className={styles.push}>
        <CommandAction action="push" icon="M8 13V3m-4 4 4-4 4 4" />
      </div>
    </>
  );
}
