import { useState } from "react";
import { OfficeToolbar } from "../viewers/OfficeToolbar";
import { t } from "../i18n";
export function OfficeSpecimens() {
  const [zoom, setZoom] = useState(100),
    [page, setPage] = useState(1),
    [sheet, setSheet] = useState(0);
  return (
    <section id="office-specimens">
      <h2>
        {t("officeSample")} ({t("sample")})
      </h2>
      <OfficeToolbar
        zoom={zoom}
        page={page}
        pages={3}
        sheet={0}
        sheets={[]}
        slides
        ready
        onZoom={setZoom}
        onPage={setPage}
        onSheet={setSheet}
      />
      <p>{t("officeFidelity")}</p>
      <OfficeToolbar
        zoom={zoom}
        page={1}
        pages={1}
        sheet={sheet}
        sheets={[
          { name: "Summary", truncated: true },
          { name: "Notes", truncated: false },
        ]}
        slides={false}
        ready
        onZoom={setZoom}
        onPage={setPage}
        onSheet={setSheet}
      />
      <p>{t("officeRows")}</p>
      <p>{t("officeUnsupported")}</p>
      <p>{t("officecorrupt")}</p>
      <p>{t("officepassword")}</p>
      <p>{t("officelimit")}</p>
      <p>{t("officetimeout")}</p>
      <p>{t("officeShortcuts")}</p>
    </section>
  );
}
