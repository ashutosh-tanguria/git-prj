import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Checkbox } from "../ui/Checkbox";
import type { PreviewState } from "../ui/types";
import { t } from "../i18n";
import styles from "./Styleguide.module.css";
export const states: PreviewState[] = [
  "default",
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "loading",
  "error",
  "selected",
];
export function PrimitiveMatrix() {
  const options = [
    { value: "", label: t("empty") },
    { value: "semester", label: t("location") },
    { value: "long", label: t("longOption") },
  ];
  const rows: { name: string; render: (state: PreviewState) => ReactNode }[] = [
    ...(["primary", "secondary", "quiet", "danger"] as const).map(
      (variant) => ({
        name: t(variant),
        render: (state: PreviewState) => (
          <>
            <Button
              variant={variant}
              previewState={state}
              isDisabled={state === "disabled"}
              loading={state === "loading"}
              selected={state === "selected" ? true : undefined}
            >
              {t(state === "loading" ? "busy" : "action")}
            </Button>
            {state === "error" && (
              <span className={styles.error}>{t("errorText")}</span>
            )}
          </>
        ),
      }),
    ),
    {
      name: t("icon"),
      render: (state) => (
        <>
          <IconButton
            aria-label={t("icon")}
            previewState={state}
            isDisabled={state === "disabled"}
            loading={state === "loading"}
            selected={state === "selected" ? true : undefined}
          />
          {state === "error" && (
            <span className={styles.error}>{t("errorText")}</span>
          )}
        </>
      ),
    },
    {
      name: t("input"),
      render: (state) => (
        <Input
          label={t("input")}
          defaultValue={t("name")}
          previewState={state}
          disabled={state === "disabled"}
          readOnly={state === "loading"}
          aria-busy={state === "loading" || undefined}
          error={state === "error" ? t("errorText") : undefined}
        />
      ),
    },
    {
      name: t("select"),
      render: (state) => (
        <Select
          label={t("select")}
          options={options}
          defaultValue={state === "selected" ? "semester" : ""}
          previewState={state}
          disabled={state === "disabled" || state === "loading"}
          aria-busy={state === "loading" || undefined}
          error={state === "error" ? t("errorText") : undefined}
        />
      ),
    },
    {
      name: t("checkbox"),
      render: (state) => (
        <>
          <Checkbox
            previewState={state}
            isDisabled={state === "disabled" || state === "loading"}
            isSelected={state === "selected"}
            isInvalid={state === "error"}
            aria-busy={state === "loading" || undefined}
          >
            {t("checkbox")}
          </Checkbox>
          {state === "error" && (
            <span className={styles.error}>{t("errorText")}</span>
          )}
        </>
      ),
    },
  ];
  return (
    <div>
      {rows.map((row) => (
        <section className={styles.matrixRow} key={row.name}>
          <h3>{row.name}</h3>
          <div className={styles.states}>
            {states.map((state) => (
              <div className={styles.cell} key={state}>
                <span className={styles.stateLabel}>
                  {t("states." + state)}
                </span>
                {row.render(state)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
