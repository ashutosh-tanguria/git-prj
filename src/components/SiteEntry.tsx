import "../i18n/preview";
import "../i18n/storage";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Entry } from "../services/library";
import { detectSite, type SiteTarget } from "../services/sitePreview";
import { refString, type GitRef } from "../lib/refs";
import { SitePreview } from "./SitePreview";
import { t } from "../i18n";
import {
  githubTransferSource,
  requestTransfer,
} from "../services/transferRequests";
import type { TransferSource } from "../services/transferTypes";
import styles from "./SitePreview.module.css";
export function SiteEntry({
  current,
  selection,
  account = "",
}: {
  current: GitRef | null;
  selection: Entry[];
  account?: string;
}) {
  const [storageNotice, setStorageNotice] = useState("");
  const [target, setTarget] = useState<SiteTarget | null>(null),
    [opened, setOpened] = useState<SiteTarget>();
  const [menu, setMenu] = useState<{
    target?: SiteTarget;
    sources: TransferSource[];
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
    const controller = new AbortController();
    const context = (event: Event) => {
      const { entry, sources, x, y } = (
        event as CustomEvent<{
          entry?: Entry;
          sources?: TransferSource[];
          x: number;
          y: number;
        }>
      ).detail;
      const items =
        sources ??
        (entry && account ? [githubTransferSource(account, entry)] : []);
      const next = { sources: items, x, y };
      if (items.length) setMenu(next);
      if (
        current &&
        entry &&
        (entry.kind === "dir" || /\.html?$/i.test(entry.name))
      )
        void detectSite(current, [entry], controller.signal)
          .then((value) => {
            if (value && !controller.signal.aborted)
              setMenu((old) =>
                old === next || !items.length
                  ? { ...next, target: value }
                  : old,
              );
          })
          .catch(() => undefined);
    };
    window.addEventListener("shelf-site-context", context);
    return () => {
      controller.abort();
      window.removeEventListener("shelf-site-context", context);
    };
  }, [key, account]);
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
      {storageNotice && <p role="status">{storageNotice}</p>}
      {menu &&
        createPortal(
          <div
            role="menu"
            tabIndex={-1}
            aria-label={t("transferActions")}
            data-site-menu
            className={styles.context}
            style={{
              left: Math.max(0, Math.min(menu.x, innerWidth - 220)),
              top: Math.max(0, Math.min(menu.y, innerHeight - 132)),
            }}
            onKeyDown={(event) => {
              if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
              const buttons = [
                ...event.currentTarget.querySelectorAll("button"),
              ];
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              buttons[
                (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                  buttons.length
              ]?.focus();
              event.preventDefault();
            }}
          >
            {menu.target && (
              <button
                role="menuitem"
                onClick={() => {
                  setOpened(menu.target);
                  setMenu(undefined);
                }}
              >
                {t("previewSite")}
              </button>
            )}
            {menu.sources.some(
              (source) => "endpoint" in source && source.entry.kind === "file",
            ) && (
              <button
                role="menuitem"
                onClick={() => {
                  const sources = menu.sources.filter(
                    (source) =>
                      "endpoint" in source && source.entry.kind === "file",
                  );
                  setMenu(undefined);
                  void Promise.all(
                    sources.map(async (source) => {
                      if (!("endpoint" in source)) return;
                      if (source.endpoint.provider === "github") {
                        const { readGitHub } =
                          await import("../services/githubCache");
                        const { parseRef } = await import("../lib/refs");
                        await readGitHub(
                          account,
                          parseRef(source.entry.ref),
                          undefined,
                          undefined,
                          true,
                        );
                      } else {
                        window.dispatchEvent(
                          new CustomEvent("shelf-cloud-pin", {
                            detail: source.entry,
                          }),
                        );
                      }
                    }),
                  ).then(
                    () => {
                      if (
                        sources.some(
                          (source) =>
                            "endpoint" in source &&
                            source.endpoint.provider === "github",
                        )
                      )
                        setStorageNotice(t("keptOffline"));
                    },
                    () => setStorageNotice(t("storageFull")),
                  );
                }}
              >
                {t("keepOffline")}
              </button>
            )}
            {menu.sources.length > 0 &&
              [true, false].map((move) => (
                <button
                  key={String(move)}
                  role="menuitem"
                  onClick={() => {
                    requestTransfer({
                      items: menu.sources.map((source) => ({ source })),
                      move,
                    });
                    setMenu(undefined);
                  }}
                >
                  {t(move ? "moveTo" : "copyTo")}
                </button>
              ))}
          </div>,
          document.body,
        )}
      {opened && (
        <SitePreview target={opened} onClose={() => setOpened(undefined)} />
      )}
    </>
  );
}
