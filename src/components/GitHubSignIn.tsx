import { useEffect, useState } from "react";
import {
  githubOAuthSession,
  lockGitHubSession,
} from "../providers/github/client";
import {
  beginGitHubSignIn,
  githubOAuthEnabled,
  installationUrl,
} from "../providers/github/oauthFlow";
import {
  GitHubOAuthSession,
  workerOrigin,
} from "../providers/github/oauthSession";
import {
  forgetGitHubVault,
  hasGitHubVault,
  rememberGitHubVault,
  unlockGitHubVault,
  watchGitHubIdle,
} from "../providers/github/oauthVault";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import styles from "./Library.module.css";

export default function GitHubSignIn({
  connected,
  busy,
  onConnect,
}: {
  connected: boolean;
  busy: boolean;
  onConnect(session: GitHubOAuthSession, idleMinutes?: number): Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void hasGitHubVault()
      .then((value) => {
        if (active) setSaved(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [connected]);

  async function run(action: () => Promise<void>) {
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      const key = (error as Error).message;
      setMessage(
        ["githubWrongPassphrase", "githubTryLater"].includes(key)
          ? key
          : "githubSignInError",
      );
    } finally {
      setPassphrase("");
      setWorking(false);
    }
  }

  async function submit() {
    const session = githubOAuthSession();
    if (session) {
      await rememberGitHubVault(session, passphrase, Number(minutes));
      watchGitHubIdle(session, Number(minutes), lockGitHubSession);
      setSaved(true);
    } else {
      const unlocked = await unlockGitHubVault(passphrase);
      await onConnect(
        await GitHubOAuthSession.unlock(workerOrigin, unlocked.store),
        unlocked.minutes,
      );
    }
    setExpanded(false);
  }

  const disabled = busy || working;
  if (!githubOAuthEnabled) return null;
  return (
    <div className={styles.tokenForm}>
      {!connected && (
        <>
          <p>{t("githubAppAccess")}</p>
          <Button
            variant="primary"
            isDisabled={disabled}
            onPress={() => void run(beginGitHubSignIn)}
          >
            {t("githubSignIn")}
          </Button>
          {saved && (
            <Button
              isDisabled={disabled}
              onPress={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {t("githubUnlock")}
            </Button>
          )}
        </>
      )}
      <a href={installationUrl} target="_blank" rel="noopener noreferrer">
        {t("githubInstallMore")}
      </a>
      {connected && !saved && (
        <Button
          isDisabled={disabled}
          onPress={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {t("githubRemember")}
        </Button>
      )}
      {connected && saved && (
        <Button
          isDisabled={disabled}
          onPress={() =>
            void run(async () => {
              await forgetGitHubVault();
              lockGitHubSession();
            })
          }
        >
          {t("githubForget")}
        </Button>
      )}
      {expanded && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(submit);
          }}
        >
          <Input
            label={t("githubPassphrase")}
            type="password"
            value={passphrase}
            autoComplete={connected ? "new-password" : "current-password"}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          {connected && (
            <Input
              label={t("githubIdleMinutes")}
              type="number"
              min={1}
              max={120}
              step={1}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          )}
          <Button
            type="submit"
            isDisabled={
              disabled ||
              !passphrase ||
              (connected &&
                (!Number.isInteger(Number(minutes)) ||
                  Number(minutes) < 1 ||
                  Number(minutes) > 120))
            }
          >
            {t(connected ? "githubRemember" : "githubUnlock")}
          </Button>
        </form>
      )}
      {message && <p role="alert">{t(message)}</p>}
    </div>
  );
}
