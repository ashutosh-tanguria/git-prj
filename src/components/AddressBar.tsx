import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function AddressBar({
  value,
  onGo,
}: {
  value: string;
  onGo: (value: string) => void;
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
      <Button onPress={() => history.back()}>{t("back")}</Button>
      <Button onPress={() => history.forward()}>{t("forward")}</Button>
      <label className={styles.address}>
        {t("address")}
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
    </form>
  );
}
