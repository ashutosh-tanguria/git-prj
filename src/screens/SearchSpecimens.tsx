import { useState } from "react";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/Kbd";
import { PaletteBox } from "../components/CommandPalette";
import { TextResult } from "../components/TextResult";
import { IndexingIndicator } from "../components/IndexingStatus";
import { StorageSettings } from "../components/StorageSettings";
import { StatusBar } from "../components/ReadChrome";
import "../i18n/search";
import "../i18n/storage";
import styles from "./Styleguide.module.css";

export function SearchSpecimens() {
  const [query, setQuery] = useState("?");
  const [paused, setPaused] = useState(false);
  return (
    <section id="search-specimens" className={styles.section}>
      <h2>{t("commandPalette")}</h2>
      <PaletteBox
        value={query}
        onChange={setQuery}
        status={t("paletteCount", { count: 2 })}
        options={[
          {
            id: "match",
            content: (
              <TextResult
                item={{
                  scope: "github:sample",
                  ref: "gh:sample/reading@main/archive.pdf",
                  path: "reading/archive.pdf",
                  name: "archive.pdf",
                  page: 12,
                  before: t("sampleSnippetBefore"),
                  match: t("sampleSnippetMatch"),
                  after: ".",
                  score: 1,
                }}
              />
            ),
            choose: () => {},
          },
          {
            id: "settings",
            content: (
              <>
                <span>{t("paletteOpenSettings")}</span>
                <Kbd>Alt+Shift+g</Kbd>
              </>
            ),
            choose: () => {},
          },
        ]}
      />
      <IndexingIndicator
        progress={paused ? undefined : { done: 12, total: 40 }}
        paused={paused}
        onToggle={() => setPaused((value) => !value)}
      />
      <p>{t("index_scanned")}</p>
      <p>{t("index_tooLarge")}</p>
      <section aria-label={t("offline")}>
        <StatusBar account="" onlineOverride={false} />
        <p>{t("offlineMissing")}</p>
        <p>{t("pushOffline")}</p>
        <Button isDisabled>{t("push")}</Button>
        <label>
          <input type="checkbox" /> {t("pushWhenOnline")}
        </label>
      </section>
      <StorageSettings specimen />
    </section>
  );
}
