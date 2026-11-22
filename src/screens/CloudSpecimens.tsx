import { CloudProviderRows, CloudQuota } from "../components/CloudProviderRows";
import { providerIds } from "../providers/flags";
import { t } from "../i18n";
import "../i18n/cloud";
import styles from "./Styleguide.module.css";

export function CloudSpecimens() {
  return (
    <section id="cloud-specimens" className={styles.section}>
      <h2>{t("cloudSpecimen")}</h2>
      <CloudProviderRows
        ids={providerIds}
        connected={new Set(["gdrive"])}
        busy
        onToggle={() => {}}
        settings
      />
      <p>
        <CloudQuota quota={{ used: 97 * 1048576, total: 100 * 1048576 }} />
      </p>
      <h3>{t("push")}</h3>
      <p>{t("cloudSequential")}</p>
      <ul>
        <li>
          {t("uploadFiles")} · reading-notes.txt{" "}
          <progress aria-label="reading-notes.txt" value={7} max={10} />
        </li>
        <li>
          {t("delete")} · draft.txt <p>{t("gdriveTrash")}</p>
        </li>
      </ul>
    </section>
  );
}
