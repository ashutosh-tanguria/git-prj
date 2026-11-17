import { t } from "../i18n";
import styles from "./Guards.module.css";
export function VisibilityBadge({ visibility }: { visibility: string }) {
  const publicRepo = visibility === t("public") || visibility === "public";
  return (
    <span className={styles.visibility} data-public={publicRepo}>
      {publicRepo ? "◉" : "▣"}{" "}
      {visibility === t("private") || visibility === "private"
        ? t("privateBadge")
        : publicRepo
          ? t("publicBadge")
          : t("unknown")}
    </span>
  );
}
