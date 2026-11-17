import "../i18n/preview";
import { useEffect, useRef, useState } from "react";
import { ModalOverlay, Modal, Dialog } from "react-aria-components";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import {
  pagesUrl,
  prepareSite,
  type SiteTarget,
} from "../services/sitePreview";
import {
  sandboxOrigin,
  startSiteSession,
  type SiteEvent,
} from "../services/siteSession";
import { SiteToolbar } from "./SiteToolbar";
import { SitePreviewView } from "./SitePreviewView";
import styles from "./SitePreview.module.css";
export function SitePreview({
  target,
  onClose,
}: {
  target: SiteTarget;
  onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(false),
    [revision, reload] = useState(0);
  const [blocked, setBlocked] = useState(true),
    [viewport, setViewport] = useState("desktop");
  const [events, setEvents] = useState<SiteEvent[]>([]),
    [error, setError] = useState("");
  const [loaded, setLoaded] = useState(0),
    [preparing, setPreparing] = useState(false);
  const [pages, setPages] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    void pagesUrl(target.ref, controller.signal)
      .then(setPages)
      .catch(() => {
        if (!controller.signal.aborted) setPages(undefined);
      });
    return () => controller.abort();
  }, [target]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let stop: (() => void) | undefined;
    setError("");
    setEvents([]);
    setLoaded(0);
    setPreparing(true);
    void (async () => {
      try {
        const origin =
          import.meta.env.VITE_SANDBOX_ORIGIN ||
          (__STYLEGUIDE__
            ? "http://127.0.0.1:4174"
            : import.meta.env.DEV
              ? "http://127.0.0.1:5174"
              : "");
        if (!origin) throw Error("siteOrigin");
        sandboxOrigin(origin);
        const site = await prepareSite(target, controller.signal);
        if (controller.signal.aborted || !frame.current) return;
        stop = startSiteSession(
          frame.current,
          origin,
          site.files,
          target.entry,
          blocked,
          async (path, signal) => {
            const bytes = await site.read(path, signal);
            if (!signal.aborted) setLoaded((value) => value + 1);
            return bytes;
          },
          (event) => {
            if (controller.signal.aborted) return;
            if (event.type === "error") setError(t("siteError"));
            else setEvents((old) => [...old.slice(-199), event]);
          },
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            t(
              ["siteOrigin", "siteServer", "siteLimit", "siteSpecial"].includes(
                (error as Error).message,
              )
                ? (error as Error).message
                : "siteError",
            ),
          );
      } finally {
        if (!controller.signal.aborted) setPreparing(false);
      }
    })();
    return () => {
      controller.abort();
      stop?.();
    };
  }, [active, revision, blocked, target]);
  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={styles.overlay}
    >
      <Modal className={styles.modal}>
        <Dialog aria-label={t("sitePanel")} className={styles.dialog}>
          <header className={styles.heading}>
            <h2>{t("sitePanel")}</h2>
            <Button onPress={onClose}>{t("siteClose")}</Button>
          </header>
          <SitePreviewView
            repo={target.ref.owner + "/" + target.ref.repo}
            blocked={blocked}
            viewport={viewport}
            events={events}
            loaded={loaded}
            toolbar={
              <SiteToolbar
                active={active}
                blocked={blocked}
                viewport={viewport}
                onRun={() => setActive((value) => !value)}
                onReload={() => reload((value) => value + 1)}
                onBlock={setBlocked}
                onViewport={setViewport}
                target={target.ref}
                pages={pages}
              />
            }
          >
            {error && <p role="alert">{error}</p>}
            {target.server && !active && <p>{t("siteServer")}</p>}
            {preparing && <p role="status">{t("sitePreparing")}</p>}
            {!active ? (
              <p>{t("siteStopped")}</p>
            ) : (
              <iframe
                ref={frame}
                title={t("sitePanel")}
                sandbox="allow-scripts allow-same-origin"
                referrerPolicy="no-referrer"
                allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'"
              />
            )}
          </SitePreviewView>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
