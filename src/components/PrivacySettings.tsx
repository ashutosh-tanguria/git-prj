import { useState } from "react";
import "../i18n/platform";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { workerOrigin } from "../providers/github/oauthSession";
import {
  appThirdPartyHosts,
  explicitHandOffHosts,
  oneDriveTransferSuffixes,
} from "../services/networkAllowlist";
import { diagnostics } from "../services/diagnostics";
import styles from "./PrivacySettings.module.css";

const rows = [
  ["privacyTokens", "privacyEncrypted", "privacyUntilDisconnect"],
  ["privacyBytes", "privacyOpfsFallback", "privacyLru"],
  ["privacyListings", "privacyIndexedDb", "privacyListingRetention"],
  ["privacyStaged", "privacyStagedWhere", "privacyStagedRetention"],
  ["privacyPdfIndex", "privacyIndexedDb", "privacyIndexRetention"],
  ["privacySettings", "privacyIndexedDb", "privacyUntilWipe"],
];

export default function PrivacySettings({
  specimen = false,
}: {
  specimen?: boolean;
}) {
  const [message, setMessage] = useState("");
  const hosts = [
    ...appThirdPartyHosts,
    ...oneDriveTransferSuffixes.map((suffix) => "*" + suffix),
    ...explicitHandOffHosts,
  ];
  for (const origin of [workerOrigin, import.meta.env.VITE_SANDBOX_ORIGIN]) {
    if (origin) hosts.push(new URL(origin).host);
  }
  async function copy() {
    try {
      if (!specimen) await navigator.clipboard.writeText(diagnostics());
      setMessage("privacyCopied");
    } catch {
      setMessage("privacyCopyFailed");
    }
  }
  return (
    <section className={styles.privacy}>
      <p>{t("privacyNoTelemetry")}</p>
      <table>
        <caption>{t("privacyWhatIsStored")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("privacyData")}</th>
            <th scope="col">{t("privacyWhere")}</th>
            <th scope="col">{t("privacyRetention")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([data, where, retention]) => (
            <tr key={data}>
              <th scope="row">{t(data)}</th>
              <td>{t(where)}</td>
              <td>{t(retention)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t("privacyWipe")}</p>
      <h3>{t("privacyHosts")}</h3>
      <ul>
        {hosts.map((host) => (
          <li key={host}>{host}</li>
        ))}
      </ul>
      <p>{t("privacyHandOff")}</p>
      <Button onPress={() => void copy()}>{t("privacyCopyDiagnostics")}</Button>
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
