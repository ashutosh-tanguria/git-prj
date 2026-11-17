import { useState } from "react";
import { SiteToolbar } from "../components/SiteToolbar";
import { SitePreviewView } from "../components/SitePreviewView";
import { t } from "../i18n";
import { MediaStatus } from "../components/MediaStatus";
export function PreviewSpecimens() {
  const [active, setActive] = useState(false),
    [blocked, setBlocked] = useState(true),
    [viewport, setViewport] = useState("desktop");
  return (
    <section id="preview-specimens">
      <h2>
        {t("sitePanel")} ({t("sample")})
      </h2>
      <SitePreviewView
        repo="sample/static-reading-room"
        blocked={blocked}
        viewport={viewport}
        loaded={3}
        events={[
          { type: "request", path: "assets/missing.png", status: "failed" },
          {
            type: "request",
            path: "https://api.github.com",
            status: "blocked",
          },
        ]}
        toolbar={
          <SiteToolbar
            active={active}
            blocked={blocked}
            viewport={viewport}
            target={{
              owner: "sample",
              repo: "static-reading-room",
              branch: "main",
              path: "docs",
            }}
            onRun={() => setActive((value) => !value)}
            onReload={() => {}}
            onBlock={setBlocked}
            onViewport={setViewport}
          />
        }
      >
        <p>{t(active ? "siteServer" : "siteStopped")}</p>
        <p>{t("siteLimit")}</p>
        <p>{t("mediaLimit")}</p>
        <MediaStatus value={{ loaded: 5 * 1048576, total: 12 * 1048576 }} />
        <MediaStatus
          value={{ loaded: 12 * 1048576, total: 12 * 1048576, cached: true }}
        />
      </SitePreviewView>
    </section>
  );
}
