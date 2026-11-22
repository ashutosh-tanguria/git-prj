import { lazy, Suspense, useState, type ReactNode } from "react";
import { ProviderMark } from "../ui/ProviderMark";

import styles from "./Library.module.css";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { CommandAction } from "./CommandBar";
import { githubOAuthSession } from "../providers/github/client";
import type { GitHubOAuthSession } from "../providers/github/oauthSession";
const TokenPresets = lazy(() =>
  import("./TokenPresets").then((m) => ({ default: m.TokenPresets })),
);
const GitHubSignIn = lazy(() => import("./GitHubSignIn"));
export function ConnectPanel({
  token,
  onToken,
  onConnect,
  loading,
  providerRows,
  settings,
  connected,
  onDisconnect,
  onOAuth,
}: {
  token: string;
  onToken: (token: string) => void;
  onConnect: () => void;
  loading: boolean;
  providerRows?: ReactNode;
  settings?: boolean;
  connected?: boolean;
  onDisconnect?(): void;
  onOAuth?(session: GitHubOAuthSession, idleMinutes?: number): Promise<void>;
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
          {t(
            connected
              ? githubOAuthSession()
                ? "githubSignOut"
                : "disconnect"
              : "connectAction",
          )}
        </Button>
      </div>
      {import.meta.env.VITE_GITHUB_APP_CLIENT_ID &&
        import.meta.env.VITE_OAUTH_WORKER_URL &&
        onOAuth &&
        (!connected || githubOAuthSession()) && (
          <Suspense fallback={null}>
            <GitHubSignIn
              busy={loading}
              onConnect={onOAuth}
              connected={Boolean(connected)}
            />
          </Suspense>
        )}
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
