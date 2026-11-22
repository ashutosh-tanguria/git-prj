import "../i18n/githubOAuth";
import "../i18n/platform";
import PrivacySettings from "../components/PrivacySettings";
import { t } from "../i18n";
import { Button } from "../ui/Button";

export function PlatformSpecimens() {
  return (
    <section aria-labelledby="platform-privacy">
      <h2 id="platform-privacy">{t("privacyTitle")}</h2>
      <PrivacySettings specimen />
      <h3>{t("githubSignIn")}</h3>
      <p>{t("githubAppAccess")}</p>
      <Button>{t("githubSignIn")}</Button>
      <Button>{t("githubRemember")}</Button>
      <p>{t("pwaUpdateReady")}</p>
      <Button>{t("pwaReload")}</Button>
    </section>
  );
}
