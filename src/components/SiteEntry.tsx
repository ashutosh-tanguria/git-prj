import "../i18n/preview";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Entry } from "../services/library";
import { detectSite, type SiteTarget } from "../services/sitePreview";
import { refString, type GitRef } from "../lib/refs";
import { SitePreview } from "./SitePreview";
import { t } from "../i18n";
import styles from "./SitePreview.module.css";
export function SiteEntry({
  current,
  selection,
}: {
  current: GitRef | null;
  selection: Entry[];
}) {
  const [target, setTarget] = useState<SiteTarget | null>(null),
    [opened, setOpened] = useState<SiteTarget>();
  const [menu, setMenu] = useState<{
    target: SiteTarget;
    x: number;
    y: number;
  }>();
  const key = current ? refString(current) : "";
  const selectedKey = selection.map((entry) => entry.ref).join("\n");
  useEffect(() => {
    setTarget(null);
    setOpened(undefined);
    setMenu(undefined);
    if (!current) return;
    const controller = new AbortController();
    void detectSite(current, selection, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setTarget(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTarget(null);
      });
    return () => controller.abort();
  }, [key, selectedKey]);
  useEffect(() => {
    const status = () =>
      window.dispatchEvent(
        new CustomEvent("shelf-site-available", { detail: !!target }),
      );
    const open = () => {
      if (target) setOpened(target);
    };
    status();
    window.addEventListener("shelf-site-status", status);
    window.addEventListener("shelf-preview-site", open);
    return () => {
      window.removeEventListener("shelf-site-status", status);
      window.removeEventListener("shelf-preview-site", open);
    };
  }, [target]);
  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    const context = (event: Event) => {
      const { entry, x, y } = (
        event as CustomEvent<{ entry: Entry; x: number; y: number }>
      ).detail;
      void detectSite(current, [entry], controller.signal)
        .then((value) => {
          if (value && !controller.signal.aborted)
            setMenu({ target: value, x, y });
        })
        .catch(() => setMenu(undefined));
    };
    window.addEventListener("shelf-site-context", context);
    return () => {
      controller.abort();
      window.removeEventListener("shelf-site-context", context);
    };
  }, [key]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement;
    document.querySelector<HTMLElement>("[data-site-menu] button")?.focus();
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      setMenu(undefined);
      previous?.focus();
    };
    const outside = (event: Event) => {
      if (!(event.target as HTMLElement).closest("[data-site-menu]"))
        close(event);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);
  return (
    <>
      {menu &&
        createPortal(
          <div
            role="menu"
            aria-label={t("previewSite")}
            data-site-menu
            className={styles.context}
            style={{
              left: Math.max(0, Math.min(menu.x, innerWidth - 220)),
              top: Math.max(0, Math.min(menu.y, innerHeight - 64)),
            }}
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpened(menu.target);
                setMenu(undefined);
              }}
            >
              {t("previewSite")}
            </button>
          </div>,
          document.body,
        )}
      {opened && (
        <SitePreview target={opened} onClose={() => setOpened(undefined)} />
      )}
    </>
  );
}
