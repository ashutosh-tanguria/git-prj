import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
import v2 from "./ExplorerV2.module.css";
export function AddressBar({
  value,
  onGo,
  onRefresh,
}: {
  value: string;
  onGo: (value: string) => void;
  onRefresh?: () => void;
}) {
  const [draft, setDraft] = useState(value),
    [editing, setEditing] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setEditing(true);
        requestAnimationFrame(() => {
          field.current?.focus();
          field.current?.select();
        });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <form
      className={styles.toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        onGo(draft);
        setEditing(false);
      }}
    >
      <Button
        variant="quiet"
        aria-label={t("back")}
        onPress={() => history.back()}
      >
        <svg
          className={styles.actionGlyph}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="m9 3-5 5 5 5M4 8h9" />
        </svg>
        <span className={styles.historyText}>{t("back")}</span>
      </Button>
      <Button
        variant="quiet"
        aria-label={t("forward")}
        onPress={() => history.forward()}
      >
        <svg
          className={styles.actionGlyph}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="m7 3 5 5-5 5M3 8h9" />
        </svg>
        <span className={styles.historyText}>{t("forward")}</span>
      </Button>
      <label className={styles.address}>
        <span className={styles.addressLabel}>{t("address")}</span>
        <input
          ref={field}
          aria-label={t("address")}
          value={draft}
          onFocus={() => setEditing(true)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
              e.currentTarget.blur();
            }
          }}
          readOnly={!editing}
          list="address-completion"
        />
      </label>
      <datalist id="address-completion">
        <option value={value} />
        <option value={value.slice(0, value.lastIndexOf("/"))} />
      </datalist>
      <Button type="submit">{t("go")}</Button>
      <Button
        variant="quiet"
        aria-label={t("refresh")}
        onPress={onRefresh}
        isDisabled={!onRefresh}
      >
        {t("refresh")}
      </Button>
      <label className={v2.search} title={t("searchLater")}>
        <input
          aria-label={t("searchFolder")}
          placeholder={t("searchFolder")}
          disabled
        />
      </label>
    </form>
  );
}
