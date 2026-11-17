import "../i18n/preview";
import type { ReactNode } from "react";
import { t } from "../i18n";
import type { SiteEvent } from "../services/siteSession";
import styles from "./SitePreview.module.css";
export function SitePreviewView({
  repo,
  toolbar,
  children,
  events,
  blocked,
  viewport,
  loaded,
}: {
  repo: string;
  toolbar: ReactNode;
  children: ReactNode;
  events: SiteEvent[];
  blocked: boolean;
  viewport: string;
  loaded: number;
}) {
  return (
    <section className={styles.panel} aria-label={t("sitePanel")}>
      <p className={styles.banner} data-untrusted-banner>
        {t("siteBanner", { repo })}
      </p>
      {toolbar}
      {!blocked && <p role="status">{t("siteExternal")}</p>}
      <p role="status">
        {t("siteLoaded")}: {loaded}
      </p>
      <div className={styles.stage} data-viewport={viewport}>
        {children}
      </div>
      {(["request", "console"] as const).map((kind) => (
        <details key={kind} className={styles.logs}>
          <summary>
            {t(kind === "request" ? "siteRequests" : "siteConsole")} (
            {events.filter((event) => event.type === kind).length})
          </summary>
          {events.some((event) => event.type === kind) ? (
            <ul>
              {events
                .filter((event) => event.type === kind)
                .map((event, index) => (
                  <li key={index}>
                    {kind === "request" &&
                      t(
                        event.status === "blocked"
                          ? "siteBlocked"
                          : "siteFailed",
                      ) + ": "}
                    <code>{event.path}</code>
                  </li>
                ))}
            </ul>
          ) : (
            <p>{t(kind === "request" ? "siteNoRequests" : "siteNoConsole")}</p>
          )}
        </details>
      ))}
    </section>
  );
}
