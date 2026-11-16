import { t } from "../i18n";
import styles from "./Library.module.css";
export function GuardStrip() {
  return <aside className={styles.strip}>{t("guardCopy")}</aside>;
}
export function StatusBar({ account }: { account: string }) {
  return (
    <footer className={styles.strip}>
      {t(navigator.onLine ? "online" : "offline")} | {account}
    </footer>
  );
}
export function PendingTray() {
  return <div className={styles.strip}>{t("noPending")}</div>;
}
