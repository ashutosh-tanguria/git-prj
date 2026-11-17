import { t } from "../i18n";
export function WorkingOverride({
  value,
  onValue,
  checked,
  onChecked,
}: {
  value: string;
  onValue: (value: string) => void;
  checked: boolean;
  onChecked: (value: boolean) => void;
}) {
  return (
    <details>
      <summary>{t("repoOverride")}</summary>
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChecked(e.target.checked)}
        />
        {t("repoOverride")}
      </label>
      <label>
        {t("explanation")}
        <input value={value} onChange={(e) => onValue(e.target.value)} />
      </label>
    </details>
  );
}
