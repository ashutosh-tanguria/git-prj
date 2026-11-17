import type { RefObject } from "react";
import { parseRef, refString } from "../lib/refs";
import { t } from "../i18n";
import styles from "./Breadcrumbs.module.css";
export function Breadcrumbs({
  value,
  onGo,
  onEdit,
  editRef,
}: {
  value: string;
  onGo: (value: string) => void;
  onEdit: () => void;
  editRef: RefObject<HTMLButtonElement | null>;
}) {
  let parts: { label: string; value: string }[] = [];
  try {
    const r = parseRef(value);
    parts = [
      { label: "GitHub", value: refString({ ...r, path: "" }) },
      { label: r.owner, value: refString({ ...r, path: "" }) },
      {
        label: r.repo + " @ " + r.branch,
        value: refString({ ...r, path: "" }),
      },
      ...r.path
        .split("/")
        .filter(Boolean)
        .map((label, i, all) => ({
          label,
          value: refString({ ...r, path: all.slice(0, i + 1).join("/") }),
        })),
    ];
  } catch {
    /* Empty Connect address stays editable. */
  }
  const button = (part: (typeof parts)[number], i: number) => (
    <button
      type="button"
      key={i}
      title={part.label}
      onClick={() => onGo(part.value)}
    >
      {part.label}
    </button>
  );
  return (
    <div className={styles.bar} data-deep={parts.length > 4 || undefined}>
      <nav aria-label={t("breadcrumbs")}>
        {parts.length > 1 && (
          <details>
            <summary aria-label={t("moreFolders")}>...</summary>
            <div>{parts.slice(0, -1).map(button)}</div>
          </details>
        )}
        {parts.slice(0, -1).map((part, i) => (
          <span className={styles.ancestor} key={i}>
            {button(part, i)}
            <span aria-hidden="true">/</span>
          </span>
        ))}
        {parts.at(-1) && button(parts.at(-1)!, parts.length - 1)}
      </nav>
      <button
        ref={editRef}
        type="button"
        className={styles.empty}
        aria-label={t("address")}
        onClick={onEdit}
      />
    </div>
  );
}
