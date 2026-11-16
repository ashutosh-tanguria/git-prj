import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { Locations } from "./Locations";
import { Inspector } from "./Inspector";
import { PaneLayer } from "./PaneLayer";
import { usePanels } from "./usePanels";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import type { Entry, Repo } from "../services/library";
import styles from "./Library.module.css";
export function ReadShell({
  roots,
  selection,
  selectionBlob,
  visibility,
  children,
  onParent,
}: {
  roots: Repo[];
  selection: Entry[];
  selectionBlob?: Blob;
  visibility: string;
  children: ReactNode;
  onParent: () => void;
}) {
  const panels = usePanels(),
    main = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        restore.current = document.activeElement as HTMLElement;
        if (e.altKey) panels.setInspector((value) => !value);
        else panels.setLocations((value) => !value);
      } else if (
        e.altKey &&
        ["ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === "ArrowUp") onParent();
        else history.go(e.key === "ArrowLeft" ? -1 : 1);
      } else if (
        e.key === "Backspace" &&
        !(e.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"]',
        )
      ) {
        e.preventDefault();
        onParent();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onParent]);
  const close = (kind: "locations" | "inspector") => {
    if (kind === "locations") panels.setLocations(false);
    else panels.setInspector(false);
    requestAnimationFrame(() =>
      (restore.current?.isConnected
        ? restore.current
        : trigger.current
      )?.focus(),
    );
  };
  return (
    <>
      <div className={styles.skipLinks}>
        {["locations", "fileList", "inspector", "pending"].map((id) => (
          <a
            key={id}
            href={"#" + id}
            onClick={(e) => {
              e.preventDefault();
              if (id === "locations") panels.setLocations(true);
              if (id === "inspector") panels.setInspector(true);
              requestAnimationFrame(() => document.getElementById(id)?.focus());
            }}
          >
            {t("skipTo") + " " + t(id)}
          </a>
        ))}
      </div>
      <div className={styles.toolbar}>
        <button
          ref={trigger}
          className={styles.paneButton}
          onClick={() => {
            restore.current = document.activeElement as HTMLElement;
            panels.setLocations(!panels.locations);
          }}
          aria-expanded={panels.locations}
        >
          {t("locations")}
        </button>
        <Button onPress={onParent}>{t("parent")}</Button>
        <Button
          onPress={() => {
            restore.current = document.activeElement as HTMLElement;
            panels.setInspector(!panels.inspector);
          }}
          aria-expanded={panels.inspector}
        >
          {t("inspector")}
        </Button>
      </div>
      <div
        className={styles.readBody}
        style={
          {
            "--locations-current": panels.locationsWidth + "px",
            "--inspector-current": panels.inspectorWidth + "px",
          } as CSSProperties
        }
      >
        {panels.locations && panels.width >= 900 && (
          <aside id="locations" tabIndex={-1} className={styles.locationPane}>
            <Locations repos={roots} />
            <input
              type="range"
              aria-label={t("locationsWidth")}
              min={160}
              max={360}
              value={panels.locationsWidth}
              onChange={(e) => panels.setLocationsWidth(Number(e.target.value))}
            />
          </aside>
        )}
        {panels.width >= 640 && panels.width < 900 && !panels.locations && (
          <aside className={styles.rail}>
            <button
              aria-label={t("openLocations")}
              onClick={() => panels.setLocations(true)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 2h12v12H2ZM6 2v12M6 6h8" />
              </svg>
            </button>
          </aside>
        )}
        <main id="fileList" ref={main} tabIndex={-1} className={styles.content}>
          {children}
        </main>
        {panels.inspector && panels.width >= 900 && (
          <aside id="inspector" tabIndex={-1} className={styles.inspectorPane}>
            <input
              type="range"
              aria-label={t("inspectorWidth")}
              min={240}
              max={520}
              value={panels.inspectorWidth}
              onChange={(e) => panels.setInspectorWidth(Number(e.target.value))}
            />
            <Inspector
              key={selectionBlob ? "viewer" : "selection"}
              defaultTab={selectionBlob ? "details" : "preview"}
              previewBlob={selectionBlob}
              entries={selection}
              visibility={visibility}
            />
          </aside>
        )}
      </div>
      {panels.locations && panels.width < 900 && (
        <PaneLayer kind="locations" onClose={() => close("locations")}>
          <div id="locations" tabIndex={-1}>
            <Locations repos={roots} />
          </div>
        </PaneLayer>
      )}
      {panels.inspector && panels.width < 900 && (
        <PaneLayer kind="inspector" onClose={() => close("inspector")}>
          <div id="inspector" tabIndex={-1}>
            <Inspector
              key={selectionBlob ? "viewer" : "selection"}
              defaultTab={selectionBlob ? "details" : "preview"}
              previewBlob={selectionBlob}
              entries={selection}
              visibility={visibility}
            />
          </div>
        </PaneLayer>
      )}
    </>
  );
}
