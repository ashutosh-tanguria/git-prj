import { ProviderMark, type Provider } from "../ui/ProviderMark";
import { t } from "../i18n";
import type { TextMatch } from "../services/textSearch";
import "../i18n/search";

export function TextResult({ item }: { item: TextMatch }) {
  const provider = item.scope.split(":")[0] as Provider;
  return (
    <>
      <ProviderMark provider={provider} label={t(provider)} />
      <span>
        {item.path} · {t("searchPage", { count: item.page })}
      </span>
      <span>
        {item.before}
        <mark>{item.match}</mark>
        {item.after}
      </span>
    </>
  );
}
