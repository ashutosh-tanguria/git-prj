import { lazy, Suspense, useState, type ReactNode } from "react";
import { ProviderMark } from "../ui/ProviderMark";

import styles from "./Library.module.css";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { CommandAction } from "./CommandBar";
const TokenPresets = lazy(() =>
  import("./TokenPresets").then((m) => ({ default: m.TokenPresets })),
);
export function ConnectPanel({
  token,
  onToken,
  onConnect,
  loading,
  providerRows,
  settings,
  connected,
  onDisconnect,
}: {
  token: string;
  onToken: (token: string) => void;
  onConnect: () => void;
  loading: boolean;
  providerRows?: ReactNode;
  settings?: boolean;
  connected?: boolean;
  onDisconnect?(): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.connect}>
      {!settings && <h2>{t("connectTitle")}</h2>}
      <div className={styles.providerRow}>
        <ProviderMark provider="github" label="GitHub" />
        <span>
          {t(
            settings
              ? connected
                ? "connectStatusOn"
                : "connectStatusOff"
              : "connectGithubLimit",
          )}
        </span>
        <Button
          variant="primary"
          onPress={connected ? onDisconnect : () => setOpen(!open)}
          aria-expanded={open}
        >
          {t(connected ? "disconnect" : "connectAction")}
        </Button>
      </div>
      {providerRows}
      {!settings && (
        <>
          <div className={styles.providerRow}>
            <ProviderMark provider="local" label={t("connectLocal")} />
            <span>{t("connectImportExport")}</span>
            <CommandAction action="localImport" />
          </div>
          <p>
            {t("connectPushPromise")}
            <br />
            {t("connectChecksPromise")}
            <br />
            {t("connectMemoryPromise")}
          </p>
        </>
      )}
      {open && !connected && (
        <div className={styles.tokenForm}>
          <Suspense fallback={null}>
            <TokenPresets />
          </Suspense>
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
