import { lazy, Suspense } from "react";
const FileHistory = lazy(() =>
  import("./FileHistory").then((m) => ({ default: m.FileHistory })),
);
import { VisibilityBadge } from "./VisibilityBadge";
import { Button } from "../ui/Button";
import { useEffect, useState, useId, useRef } from "react";
import { InspectorTabList } from "./InspectorTabList";
import { library, type Entry } from "../services/library";
import { parseRef } from "../lib/refs";
import { ReadViewer } from "../viewers/ReadViewer";
import { t } from "../i18n";
import styles from "./Panels.module.css";
import { useSiteAvailable, openSitePreview } from "./useSiteAvailable";
import { MediaStatus } from "./MediaStatus";
import type { MediaProgress } from "../services/mediaRead";
export function Inspector({
  entries,
  visibility,
  defaultTab = "preview",
  previewBlob,
}: {
  entries: Entry[];
  visibility: string;
  defaultTab?: string;
  previewBlob?: Blob;
}) {
  const prefix = useId();
  const mediaRequest = useRef<AbortController | null>(null);
  const siteAvailable = useSiteAvailable();
  const [tab, setTab] = useState(defaultTab);
  const [blob, setBlob] = useState<Blob>(),
    [error, setError] = useState("");
  const [mediaProgress, setMediaProgress] = useState<MediaProgress>();
  const entry = entries.length === 1 ? entries[0] : undefined;
  useEffect(() => {
    setBlob(previewBlob);
    setError("");
    setMediaProgress(undefined);
    if (!entry || entry.kind !== "file" || tab !== "preview" || previewBlob)
      return;
    const controller = new AbortController();
    mediaRequest.current = controller;
    void library
      .read(parseRef(entry.ref), controller.signal, (value) => {
        if (!controller.signal.aborted) setMediaProgress(value);
      })
      .then(setBlob)
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setError(
            t(error.message === "mediaLimit" ? "mediaLimit" : "readError"),
          );
      });
    return () => controller.abort();
  }, [entry?.ref, tab, previewBlob]);
  return (
    <section aria-label={t("inspector")} className={styles.inspector}>
      <h2>{t("inspector")}</h2>
      {siteAvailable && entries.length === 1 && (
        <Button onPress={openSitePreview}>{t("previewSite")}</Button>
      )}
      <div>
        <InspectorTabList prefix={prefix} tab={tab} onTab={setTab} />
        <div
          role="tabpanel"
          id={prefix + "preview"}
          aria-labelledby={prefix + "tab-preview"}
          tabIndex={0}
          hidden={tab !== "preview"}
        >
          {tab === "preview" && (
            <>
              <MediaStatus
                value={mediaProgress}
                onCancel={() => {
                  mediaRequest.current?.abort();
                  setMediaProgress(undefined);
                  setError(t("mediaCancelled"));
                }}
              />
              {entries.length !== 1 ? (
                <p>
                  {entries.length ? t("multiPreview") : t("nothingSelected")}
                </p>
              ) : entry?.kind !== "file" ? (
                <p>{t("unsupported")}</p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : blob ? (
                <ReadViewer blob={blob} name={entry.name} fileKey={entry.ref} />
              ) : (
                <p role="status">{t("loadingRead")}</p>
              )}
            </>
          )}
        </div>
        <div
          role="tabpanel"
          id={prefix + "details"}
          aria-labelledby={prefix + "tab-details"}
          tabIndex={0}
          hidden={tab !== "details"}
        >
          {tab === "details" && (
            <>
              <p>
                {t("selectedCount")} {entries.length}
              </p>
              <p>
                {t("totalSize")}{" "}
                {new Intl.NumberFormat().format(
                  entries.reduce((sum, item) => sum + item.size, 0),
                )}{" "}
                {t("bytes")}
              </p>
              {entries.some((item) => item.kind === "dir") && (
                <p>{t("folderSizeUnknown")}</p>
              )}
              <p>{t("readGuardNotice")}</p>
              {entry && (
                <dl>
                  <dt>{t("provider")}</dt>
                  <dd>{t("github")}</dd>
                  <dt>{t("location")}</dt>
                  <dd>
                    {parseRef(entry.ref).owner +
                      "/" +
                      parseRef(entry.ref).repo +
                      "@" +
                      parseRef(entry.ref).branch}
                  </dd>
                  <dt>{t("name")}</dt>
                  <dd>{entry.name}</dd>
                  <dt>{t("type")}</dt>
                  <dd>
                    {entry.kind === "dir"
                      ? t("folder")
                      : entry.name.split(".").at(-1)}
                  </dd>
                  <dt>{t("address")}</dt>
                  <dd>
                    <code>{entry.ref}</code>
                    <Button
                      onPress={() => {
                        void navigator.clipboard.writeText(entry.ref);
                      }}
                    >
                      {t("copyPath")}
                    </Button>
                  </dd>
                  <dt>{t("hash")}</dt>
                  <dd>
                    <code>{entry.sha || t("unknown")}</code>
                    <Button
                      onPress={() => {
                        void navigator.clipboard.writeText(entry.sha);
                      }}
                    >
                      {t("copyHash")}
                    </Button>
                  </dd>
                  <dt>{t("modified")}</dt>
                  <dd>{entry.modified ?? t("unknown")}</dd>
                  <dt>{t("lastChange")}</dt>
                  <dd>
                    {entry.lastChange ?? t("unknown")}
                    <Suspense fallback={null}>
                      <FileHistory entry={entry} />
                    </Suspense>
                  </dd>
                  <dt>{t("visibility")}</dt>
                  <dd>
                    <VisibilityBadge visibility={visibility} />
                  </dd>
                  <dt>{t("cacheStatus")}</dt>
                  <dd>{t("notCached")}</dd>
                </dl>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
