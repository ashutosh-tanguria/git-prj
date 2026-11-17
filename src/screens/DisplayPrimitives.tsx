import { Badge } from "../ui/Badge";
import { Meter } from "../ui/Meter";
import { Kbd } from "../ui/Kbd";
import { Tooltip } from "../ui/Tooltip";
import { Button } from "../ui/Button";
import { FileGlyph } from "../ui/FileGlyph";
import { ProviderMark, providers } from "../ui/ProviderMark";
import { t } from "../i18n";
import styles from "./Styleguide.module.css";
export function DisplayPrimitives() {
  return (
    <div className={styles.display}>
      <section>
        <h3>{t("badge")}</h3>
        <div className={styles.inline}>
          {(["neutral", "info", "ok", "warn", "danger"] as const).map(
            (tone) => (
              <Badge key={tone} tone={tone}>
                {t(tone === "danger" ? "blocked" : tone)}
              </Badge>
            ),
          )}
        </div>
      </section>
      <section>
        <h3>{t("meter")}</h3>
        <div className={styles.inline}>
          {[14, 30, 70, 95, 100, null].map((value) => (
            <Meter
              key={String(value)}
              label={
                value === null
                  ? t("unknown")
                  : new Intl.NumberFormat(document.documentElement.lang).format(
                      value,
                    ) +
                    " " +
                    t("sizeUnit")
              }
              value={value}
            />
          ))}
        </div>
      </section>
      <section>
        <h3>{t("providers")}</h3>
        <div className={styles.inline}>
          {providers.map((provider) => (
            <ProviderMark
              key={provider}
              provider={provider}
              label={t(provider)}
            />
          ))}
        </div>
      </section>
      <section>
        <h3>{t("glyphs")}</h3>
        <div className={styles.inline}>
          {[
            "PDF",
            "DOCX",
            "CSV",
            "PPTX",
            "MD",
            "PNG",
            "MP4",
            "WAV",
            "ZIP",
            "TS",
            "?",
          ].map((ext) => (
            <FileGlyph key={ext} extension={ext} />
          ))}
          <FileGlyph extension="PDF" compact />
          <span role="img" aria-label={t("folder")}>
            <FileGlyph folder />
          </span>
        </div>
      </section>
      <section>
        <h3>{t("keyboard")}</h3>
        <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
      </section>
      <section>
        <h3>{t("tooltip")}</h3>
        <Tooltip content={t("tooltipText")}>
          <Button>{t("tooltip")}</Button>
        </Tooltip>
        <p>{t("tooltipClosed")}</p>
      </section>
      <p>{t("displayNote")}</p>
    </div>
  );
}
