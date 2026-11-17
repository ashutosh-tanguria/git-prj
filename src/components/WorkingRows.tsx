import { Button } from "../ui/Button";
import { t } from "../i18n";
import type { Change } from "../services/staging";
export function WorkingRows({
  groups,
  busy,
  onDiscard,
}: {
  groups: Map<string, Change[]>;
  busy: boolean;
  onDiscard: (ids: string[]) => void;
}) {
  return (
    <>
      {[...groups].map(([key, changes], index, all) => (
        <article key={key}>
          {(index === 0 ||
            key.split(" / ").slice(0, 2).join("/") !==
              all[index - 1][0].split(" / ").slice(0, 2).join("/")) && (
            <h3>{key.split(" / ").slice(0, 2).join(" / ")}</h3>
          )}
          {changes.map((row) => (
            <p key={row.id}>
              {t("workingKind" + row.kind)}: {row.target.path} ({row.size}{" "}
              {t("bytes")}){" "}
              <span data-verdict={row.verdict.level}>
                {t(row.verdict.code)}
              </span>
            </p>
          ))}
          <Button
            isDisabled={busy}
            onPress={() => onDiscard(changes.map((c) => c.id))}
          >
            {t("workingDiscard")}
          </Button>
        </article>
      ))}
    </>
  );
}
