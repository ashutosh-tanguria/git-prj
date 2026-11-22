import type { CloudLocations } from "./cloudTypes";
import { Sash } from "./Sash";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { Locations } from "./Locations";
import { Inspector } from "./Inspector";
const PaneLayer = lazy(() =>
  import("./PaneLayer").then(({ PaneLayer }) => ({ default: PaneLayer })),
);
import { usePanels } from "./usePanels";
import { ActionIcon } from "../ui/ActionIcon";
import { t } from "../i18n";
import type { Entry, Repo } from "../services/library";
import styles from "./Library.module.css";
export function ReadShell({
  roots,
  account,
  clouds,
  selection,
  selectionBlob,
  visibility,
  children,
  onParent,
  onSplit,
}: {
  roots: Repo[];
  account?: string;
  clouds?: CloudLocations;
  selection: Entry[];
  selectionBlob?: Blob;
  visibility: string;
  children: ReactNode;
  onParent: () => void;
  onSplit?: () => void;
}) {
  const panels = usePanels(),
    main = useRef<HTMLElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        onSplit &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.code === "Backslash" &&
        !(e.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"],[role="dialog"]',
        )
      ) {
        e.preventDefault();
        if (!e.repeat) onSplit();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
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
    const command = (event: Event) => {
      if (
        (event as CustomEvent<{ action: string }>).detail.action === "splitView"
      )
        onSplit?.();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("shelf-command", command);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("shelf-command", command);
    };
  }, [onParent, onSplit]);
  const close = (kind: "locations" | "inspector") => {
    if (kind === "locations") panels.setLocations(false);
    else panels.setInspector(false);
    requestAnimationFrame(() =>
      (restore.current?.isConnected
        ? restore.current
        : document.querySelector<HTMLButtonElement>(
            '[aria-label="' + t(kind) + '"]',
          )
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
      <div className={styles.paneControls}>
        <ActionIcon
          name="locations"
          label={t("locations")}
          aria-pressed={panels.locations}
          onPress={() => {
            restore.current = document.activeElement as HTMLElement;
            panels.setLocations(!panels.locations);
          }}
        />
        <ActionIcon
          name="inspector"
          label={t("inspector")}
          aria-pressed={panels.inspector}
          onPress={() => {
            restore.current = document.activeElement as HTMLElement;
            panels.setInspector(!panels.inspector);
          }}
        />
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
            <Locations repos={roots} clouds={clouds} account={account} />
          </aside>
        )}
        {panels.locations && panels.width >= 900 && (
          <Sash
            label={t("locationsWidth")}
            value={panels.locationsWidth}
            min={160}
            max={360}
            initial={220}
            onChange={panels.setLocationsWidth}
            onCollapse={() => panels.setLocations(false)}
          />
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
          <Sash
            label={t("inspectorWidth")}
            value={panels.inspectorWidth}
            min={240}
            max={520}
            initial={320}
            reverse
            onChange={panels.setInspectorWidth}
            onCollapse={() => panels.setInspector(false)}
          />
        )}
        {panels.inspector && panels.width >= 900 && (
          <aside id="inspector" tabIndex={-1} className={styles.inspectorPane}>
            <Inspector
              key={selectionBlob ? "viewer" : "selection"}
              defaultTab={selectionBlob ? "details" : "preview"}
              previewBlob={selectionBlob}
              entries={selection}
              account={account}
              visibility={visibility}
            />
          </aside>
        )}
      </div>
      {panels.locations && panels.width < 900 && (
        <Suspense fallback={null}>
          <PaneLayer kind="locations" onClose={() => close("locations")}>
            <div id="locations" tabIndex={-1}>
              <Locations repos={roots} clouds={clouds} account={account} />
            </div>
          </PaneLayer>
        </Suspense>
      )}
      {panels.inspector && panels.width < 900 && (
        <Suspense fallback={null}>
          <PaneLayer kind="inspector" onClose={() => close("inspector")}>
            <div id="inspector" tabIndex={-1}>
              <Inspector
                key={selectionBlob ? "viewer" : "selection"}
                defaultTab={selectionBlob ? "details" : "preview"}
                previewBlob={selectionBlob}
                entries={selection}
                account={account}
                visibility={visibility}
              />
            </div>
          </PaneLayer>
        </Suspense>
      )}
    </>
  );
}
