import { useState } from "react";
import { ProviderMark } from "../ui/ProviderMark";
import { LaterAction } from "./CommandBar";
import styles from "./Library.module.css";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { t } from "../i18n";
export function ConnectPanel({
  token,
  onToken,
  onConnect,
  loading,
}: {
  token: string;
  onToken: (token: string) => void;
  onConnect: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.connect}>
      <h2>{t("connectTitle")}</h2>
      <div className={styles.providerRow}>
        <ProviderMark provider="github" label="GitHub" />
        <Button
          variant="primary"
          onPress={() => setOpen(!open)}
          aria-expanded={open}
        >
          {t("connectAction")}
        </Button>
      </div>
      {["gdrive", "dropbox", "onedrive"].map((provider) => (
        <div className={styles.providerRow} key={provider}>
          <ProviderMark
            provider={provider as "gdrive" | "dropbox" | "onedrive"}
            label={t(provider)}
          />
          <LaterAction action="connectAction" milestone="M4" />
        </div>
      ))}
      {open && (
        <div className={styles.tokenForm}>
          <p>{t("patHelp")}</p>
          <Input
            label={t("token")}
            type="password"
            value={token}
            onChange={(e) => onToken(e.target.value)}
            autoComplete="off"
          />
          <Button
            variant="primary"
            onPress={onConnect}
            isDisabled={!token || loading}
          >
            {t("validate")}
          </Button>
        </div>
      )}
    </section>
  );
}
