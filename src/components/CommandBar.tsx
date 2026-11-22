import "../i18n/storage";
import "../i18n/search";
import { useState, useRef, useId } from "react";
import { iconPaths } from "../ui/ActionIcon";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { createPortal } from "react-dom";
import styles from "./ExplorerV2.module.css";
import { useSiteAvailable, openSitePreview } from "./useSiteAvailable";
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
export function CommandBar({
  split = false,
  offline = false,
  keepOffline = false,
  favorite,
  viewMenu,
}: {
  split?: boolean;
  offline?: boolean;
  keepOffline?: boolean;
  favorite?: React.ReactNode;
  viewMenu?: React.ReactNode;
}) {
  return (
    <nav className={styles.command} aria-label={t("commandBar")}>
      <div className={styles.desktop}>
        <CommandActions
          split={split}
          offline={offline}
          keepOffline={keepOffline}
          favorite={favorite}
          viewMenu={viewMenu}
        />
      </div>
      <details className={styles.overflow} data-command-overflow>
        <summary aria-label={t("commandBar")}>...</summary>
        <div>
          <CommandActions
            split={split}
            offline={offline}
            keepOffline={keepOffline}
            favorite={favorite}
            viewMenu={viewMenu}
          />
        </div>
      </details>
    </nav>
  );
}
export function CommandAction({
  action,
  icon,
  pressed,
  disabledReason,
}: {
  action: string;
  icon?: string;
  pressed?: boolean;
  disabledReason?: string;
}) {
  return (
    <Button
      data-action={action}
      aria-label={
        disabledReason ? t(action) + ". " + disabledReason : t(action)
      }
      aria-disabled={!!disabledReason || undefined}
      aria-pressed={pressed}
      onPress={() =>
        !disabledReason &&
        (action === "previewSite"
          ? openSitePreview()
          : window.dispatchEvent(
              new CustomEvent("shelf-command", { detail: { action } }),
            ))
      }
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d={icon || iconPaths[action] || "M3 8h10M8 3v10"} />
      </svg>
      <span>{t(action)}</span>
    </Button>
  );
}
function CommandActions({
  split,
  offline,
  keepOffline,
  favorite,
  viewMenu,
}: {
  split: boolean;
  offline: boolean;
  keepOffline: boolean;
  favorite?: React.ReactNode;
  viewMenu?: React.ReactNode;
}) {
  const siteAvailable = useSiteAvailable();
  return (
    <>
      <div>
        <CommandAction action="newFolder" />
        <CommandAction
          action="uploadFiles"
          icon="M8 12V2m-4 4 4-4 4 4M2 11v3h12v-3"
        />
        <CommandAction
          action="uploadFolder"
          icon="M2 4h5l2 2h5v8H2ZM8 12V7m-2 2 2-2 2 2"
        />
        <CommandAction action="newRepository" />
        <CommandAction
          action="localImport"
          icon="M2 4h5l2 2h5v8H2M8 8v4m-2-2h4"
        />
        {!split && (
          <CommandAction
            action="localExport"
            icon="M8 2v8m-3-3 3 3 3-3M2 11v3h12v-3"
          />
        )}
      </div>
      <div>
        <CommandAction action="cut" icon="m3 2 10 12M13 2 3 14M2 9h4v5H2Z" />
        <CommandAction action="copy" icon="M6 6h8v8H6ZM2 10V2h8" />
        <CommandAction action="paste" icon="M5 3H2v11h12V3h-3M5 2h6v3H5Z" />
        {!split && (
          <CommandAction
            action="moveTo"
            icon="M2 4h5l2 2h5v8H2m2-4h7m-3-3 3 3-3 3"
          />
        )}
        {!split && (
          <CommandAction action="copyTo" icon="M2 4h5l2 2h5v8H2m3-4h6m-3-3v6" />
        )}
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
        <CommandAction action="commandPalette" icon="M3 4h10M3 8h10M3 12h6" />
        {keepOffline && <CommandAction action="keepOffline" />}
        {favorite}
        <CommandAction
          action="splitView"
          pressed={split}
          icon="M2 2h12v12H2ZM8 2v12"
        />
        {siteAvailable && <CommandAction action="previewSite" />}
        {viewMenu ?? <CommandAction action="switchView" />}
      </div>
      <div className={styles.push}>
        <CommandAction
          action="push"
          disabledReason={offline ? t("pushOffline") : undefined}
          icon="M8 13V3m-4 4 4-4 4 4"
        />
      </div>
    </>
  );
}
