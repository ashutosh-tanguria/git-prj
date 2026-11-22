import { Button } from "../ui/Button";
import { t } from "../i18n";
export function RepositoryFallback({
  error,
  onRefresh,
  appLogin = false,
}: {
  error: string;
  onRefresh: () => void;
  appLogin?: boolean;
}) {
  return (
    <div role="alert">
      <p>{t(error)}</p>
      <a
        href="https://github.com/new"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("repoGithub")}
      </a>
      {!appLogin && (
        <details>
          <summary>{t("repoAllow")}</summary>
          <p>{t("repoGuide")}</p>
        </details>
      )}
      <Button onPress={onRefresh}>{t("repoRefresh")}</Button>
    </div>
  );
}
