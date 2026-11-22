import { lazy, Suspense, type ReactNode } from "react";
const WorkingCopy = lazy(() =>
  import("./WorkingCopy").then((m) => ({ default: m.WorkingCopy })),
);
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
import { t } from "../i18n";
import styles from "./Library.module.css";
import { Glyph } from "../ui/ActionIcon";
import type { Entry, Repo } from "../services/library";
export function GuardStrip({ repo }: { repo?: Repo }) {
  const mb = repo?.size === undefined ? undefined : repo.size / 1024;
  return (
    <aside
      className={styles.guardStrip}
      data-repo-tier={
        mb === undefined
          ? "neutral"
          : mb >= 1024
            ? "red"
            : mb >= 500
              ? "amber"
              : "neutral"
      }
    >
      <Glyph name="limit" />
      <span>{t("guardCopy")}</span>
      {repo && (
        <button
          className={styles.repoMeter}
          onClick={() => window.dispatchEvent(new Event("shelf-ledger"))}
        >
          {repo.full_name}:{" "}
          {mb === undefined
            ? t("unknown")
            : new Intl.NumberFormat(undefined, {
                maximumFractionDigits: 1,
              }).format(mb) + " MB / 1 GB"}
          {mb !== undefined && (
            <meter aria-label={t("repoSize")} min={0} max={1024} value={mb}>
              {mb} MB
            </meter>
          )}
        </button>
      )}
    </aside>
  );
}
export function StatusBar({
  account,
  entries = [],
  selection = [],
  extra,
}: {
  account: string;
  entries?: Entry[];
  selection?: Entry[];
  extra?: ReactNode;
}) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  return (
    <footer className={styles.statusStrip}>
      <span>
        {t(selection.length ? "selectionSummary" : "itemSummary", {
          count: selection.length || entries.length,
          size: new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 1,
          }).format(selection.reduce((n, r) => n + r.size, 0) / 1048576),
        })}
      </span>
      <span>{t(online ? "online" : "offline")}</span> <span>{account}</span>
      {extra}
    </footer>
  );
}
export function PendingTray() {
  return (
    <Suspense fallback={null}>
      <WorkingCopy />
    </Suspense>
  );
}
