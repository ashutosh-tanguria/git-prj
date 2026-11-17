import { Button } from "../ui/Button";
import { t } from "../i18n";
export function RepositoryFallback({
  error,
  onRefresh,
}: {
  error: string;
  onRefresh: () => void;
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
      <details>
        <summary>{t("repoAllow")}</summary>
        <p>{t("repoGuide")}</p>
      </details>
      <Button onPress={onRefresh}>{t("repoRefresh")}</Button>
    </div>
  );
}
