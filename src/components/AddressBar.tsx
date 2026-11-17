import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "../ui/ActionIcon";
import { Breadcrumbs } from "./Breadcrumbs";
import { t } from "../i18n";
import { parseRef, refString } from "../lib/refs";
import styles from "./Library.module.css";
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
  const field = useRef<HTMLInputElement>(null),
    editButton = useRef<HTMLButtonElement>(null);
  const edit = () => {
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.select();
    });
  };
  const finish = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        edit();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [value]);
  const parent = () => {
    try {
      const r = parseRef(value);
      onGo(
        refString({
          ...r,
          path: r.path.replace(/\/$/, "").split("/").slice(0, -1).join("/"),
        }),
      );
    } catch {
      /* Connect has no parent location. */
    }
  };
  return (
    <form
      className={styles.toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        onGo(draft);
        finish();
      }}
    >
      <ActionIcon
        name="back"
        label={t("back")}
        onPress={() => history.back()}
      />
      <ActionIcon
        name="forward"
        label={t("forward")}
        onPress={() => history.forward()}
      />
      <ActionIcon name="parent" label={t("parent")} onPress={parent} />
      <ActionIcon
        name="refresh"
        label={t("refresh")}
        onPress={onRefresh}
        aria-disabled={!onRefresh || undefined}
      />
      {editing ? (
        <label className={styles.address}>
          <span className={styles.addressLabel}>{t("address")}</span>
          <input
            ref={field}
            aria-label={t("address")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(value);
                finish();
              }
            }}
          />
        </label>
      ) : (
        <Breadcrumbs
          value={value}
          onGo={onGo}
          onEdit={edit}
          editRef={editButton}
        />
      )}
    </form>
  );
}
