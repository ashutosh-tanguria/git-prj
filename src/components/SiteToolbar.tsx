import "../i18n/preview";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import type { GitRef } from "../lib/refs";
import { handoffLinks } from "../services/sitePreview";
import styles from "./SitePreview.module.css";
export function SiteToolbar({
  active,
  blocked,
  viewport,
  onRun,
  onReload,
  onBlock,
  onViewport,
  target,
  pages,
}: {
  active: boolean;
  blocked: boolean;
  viewport: string;
  onRun: () => void;
  onReload: () => void;
  onBlock: (value: boolean) => void;
  onViewport: (value: string) => void;
  target: GitRef;
  pages?: string;
}) {
  return (
    <div className={styles.toolbar}>
      <Button onPress={onRun}>{t(active ? "siteStop" : "siteRun")}</Button>
      <Button isDisabled={!active} onPress={onReload}>
        {t("siteReload")}
      </Button>
      <label>
        {t("siteViewport")}{" "}
        <select
          value={viewport}
          onChange={(event) => onViewport(event.target.value)}
        >
          {["Phone", "Tablet", "Desktop"].map((name) => (
            <option value={name.toLowerCase()} key={name}>
              {t("site" + name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={blocked}
          onChange={(event) => onBlock(event.target.checked)}
        />
        {t("siteBlock")}
      </label>
      <details>
        <summary>{t("siteHandoff")}</summary>
        <div className={styles.handoff}>
          {pages && (
            <a href={pages} target="_blank" rel="noopener noreferrer">
              {t("sitePages")}
            </a>
          )}
          {Object.entries(handoffLinks(target)).map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer">
              {t(key)}
            </a>
          ))}
          <p>{t("siteCodeSandboxNotice")}</p>
          <p>{t("sitePrivateHandoff")}</p>
        </div>
      </details>
    </div>
  );
}
