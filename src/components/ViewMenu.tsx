import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import styles from "./ExplorerV2.module.css";

export const fileViews = ["viewList", "viewGrid", "viewColumns"] as const;
export type FileView = (typeof fileViews)[number];
export function ViewMenu({
  active,
  onChange,
}: {
  active: FileView;
  onChange(view: FileView): void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  useEffect(() => {
    const node = details.current;
    const open = () => {
      if (!node) return;
      const overflow = node.closest("details[data-command-overflow]");
      if (overflow instanceof HTMLDetailsElement) {
        if (!overflow.getClientRects().length) return;
        overflow.open = true;
      }
      if (!node.getClientRects().length) return;
      node.open = true;
      node.querySelector("button")?.focus();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !node?.open) return;
      event.stopPropagation();
      node.open = false;
      node.querySelector("summary")?.focus();
    };
    node?.addEventListener("keydown", escape);
    window.addEventListener("shelf-view-menu", open);
    return () => {
      node?.removeEventListener("keydown", escape);
      window.removeEventListener("shelf-view-menu", open);
    };
  }, []);
  return (
    <details
      ref={details}
      className={styles.viewMenu}
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({ top: rect.bottom, left: Math.max(4, Math.min(rect.left, innerWidth - 144)) });
      }}
    >
      <summary role="button">{t("viewMenu")}</summary>
      <div aria-label={t("viewMenu")} role="group" style={anchor}>
        {fileViews.map((view) => (
          <Button
            key={view}
            aria-pressed={view === active}
            onPress={() => {
              onChange(view);
              if (details.current) {
                details.current.open = false;
                details.current.querySelector("summary")?.focus();
              }
            }}
          >
            {t(view)}
          </Button>
        ))}
      </div>
    </details>
  );
}
