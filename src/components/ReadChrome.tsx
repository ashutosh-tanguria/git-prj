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
import type { Entry } from "../services/library";
export function GuardStrip() {
  return <aside className={styles.guardStrip}>{t("guardCopy")}</aside>;
}
export function StatusBar({
  account,
  entries = [],
  selection = [],
}: {
  account: string;
  entries?: Entry[];
  selection?: Entry[];
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
    </footer>
  );
}
export function PendingTray() {
  return (
    <div id="pending" tabIndex={-1} className={styles.pendingStrip}>
      <strong>{t("pending")}</strong>
      <span>{t("noPending")}</span>
    </div>
  );
}
