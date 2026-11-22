import { useState } from "react";
import { Button } from "../ui/Button";
import { ProviderMark, type Provider } from "../ui/ProviderMark";
import { t } from "../i18n";
import type { TextMatch } from "../services/textSearch";
import { useTextResults } from "./useTextResults";
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

export function FullTextSearch({
  scopes,
  onOpen,
}: {
  scopes: string[];
  onOpen: (item: TextMatch) => void;
}) {
  const [query, setQuery] = useState("");
  const { matches, loading } = useTextResults(scopes, query);
  return (
    <details>
      <summary>{t("textSearch")}</summary>
      <label>
        {t("textSearch")}{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p role="status">
        {loading
          ? t("searchingCache")
          : query && !matches.length
            ? t("searchNoMatches")
            : ""}
      </p>
      {matches.length > 0 && (
        <ul>
          {matches.map((item) => (
            <li key={item.scope + item.ref + item.page}>
              <Button onPress={() => onOpen(item)}>
                <TextResult item={item} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
