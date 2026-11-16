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
export function GuardStrip() {
  return <aside className={styles.strip}>{t("guardCopy")}</aside>;
}
export function StatusBar({ account }: { account: string }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  return (
    <footer className={styles.strip}>
      {t(online ? "online" : "offline")} | {account}
    </footer>
  );
}
export function PendingTray() {
  return (
    <div id="pending" tabIndex={-1} className={styles.strip}>
      {t("noPending")}
    </div>
  );
}
