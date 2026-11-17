import { useState } from "react";
import {
  defaultShortcuts,
  validShortcuts,
  type ShortcutAction,
} from "../services/shortcuts";
import { savePreference } from "../services/preferences";
import { Button } from "../ui/Button";
import { t } from "../i18n";
export function ShortcutSettings({
  bindings,
  onSave,
}: {
  bindings: typeof defaultShortcuts;
  onSave: (value: typeof defaultShortcuts) => void;
}) {
  const [draft, setDraft] = useState(bindings),
    [error, setError] = useState(false);
  const save = async () => {
    if (!validShortcuts(draft)) {
      setError(true);
      return;
    }
    await savePreference("shortcuts", draft);
    onSave(draft);
  };
  return (
    <section>
      <p>{t("shortcutUnverified")}</p>
      {(Object.keys(defaultShortcuts) as ShortcutAction[]).map((action) => (
        <label key={action}>
          {t(action)}
          <input
            value={draft[action]}
            onChange={(e) => setDraft({ ...draft, [action]: e.target.value })}
          />
        </label>
      ))}
      <Button onPress={() => void save()}>{t("shortcutSave")}</Button>
      {error && <p role="alert">{t("shortcutInvalid")}</p>}
    </section>
  );
}
