import { t } from "../i18n";
export function InspectorTabList({
  tab,
  onTab,
  prefix,
}: {
  tab: string;
  onTab: (value: string) => void;
  prefix: string;
}) {
  const keys = ["preview", "details"];
  return (
    <div
      role="tablist"
      tabIndex={-1}
      aria-label={t("inspector")}
      onKeyDown={(event) => {
        const index = keys.indexOf(tab);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? 1
              : event.key === "ArrowRight"
                ? (index + 1) % 2
                : event.key === "ArrowLeft"
                  ? (index + 1) % 2
                  : -1;
        if (next >= 0) {
          event.preventDefault();
          onTab(keys[next]);
          document.getElementById(prefix + "tab-" + keys[next])?.focus();
        }
      }}
    >
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={prefix + "tab-" + key}
          aria-controls={prefix + key}
          aria-selected={tab === key}
          data-selected={tab === key ? true : undefined}
          tabIndex={tab === key ? 0 : -1}
          onClick={() => onTab(key)}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
