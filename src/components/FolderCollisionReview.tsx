import styles from "./FolderOps.module.css";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import type { CollisionChoice } from "../services/folderTypes";
export function FolderCollisionReview({
  paths,
  onChoose,
  onCancel,
}: {
  paths: string[];
  onChoose: (choice: CollisionChoice) => void;
  onCancel: () => void;
}) {
  return (
    <section aria-label={t("folderCollision")}>
      <h3>{t("folderCollision")}</h3>
      <p>{t("folderReplaceNote")}</p>
      <ul className={styles.paths}>
        {paths.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
      <Button onPress={() => onChoose("both")}>{t("folderKeepBoth")}</Button>
      <Button onPress={() => onChoose("replace")}>{t("folderReplace")}</Button>
      <Button onPress={onCancel}>{t("workingCancel")}</Button>
    </section>
  );
}
