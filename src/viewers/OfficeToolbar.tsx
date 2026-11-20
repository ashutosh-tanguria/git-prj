import "../i18n/office";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { t } from "../i18n";
import styles from "./Office.module.css";

export interface OfficeToolbarProps {
  zoom: number;
  page: number;
  pages: number;
  slides: boolean;
  sheets: { name: string; truncated: boolean }[];
  sheet: number;
  ready: boolean;
  panelId?: string;
  onZoom: (value: number) => void;
  onPage: (value: number) => void;
  onSheet: (value: number) => void;
}
export function OfficeToolbar(props: OfficeToolbarProps) {
  return (
    <>
      <div
        className={styles.toolbar}
        role="group"
        aria-label={t("officeTitle")}
      >
        <Button selected>{t("officeQuick")}</Button>
        <Tooltip content={t("officeLater")}>
          <Button aria-disabled="true">{t("officeCloud")}</Button>
        </Tooltip>
        <label>
          {t("zoom")}
          <select
            aria-label={t("officeZoom")}
            value={props.zoom}
            disabled={!props.ready}
            onChange={(event) => props.onZoom(Number(event.target.value))}
          >
            {[25, 50, 75, 100, 125, 150, 200, 300, 400].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </label>
        {!props.sheets.length && (
          <>
            <Button
              isDisabled={!props.ready || props.page <= 1}
              onPress={() => props.onPage(props.page - 1)}
            >
              {t("officePrevious")}
            </Button>
            <label>
              {t(props.slides ? "officeSlide" : "officePage")}
              <input
                aria-label={t(props.slides ? "officeSlide" : "officePage")}
                type="number"
                min={1}
                max={props.pages}
                value={props.page}
                disabled={!props.ready}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (
                    Number.isInteger(value) &&
                    value >= 1 &&
                    value <= props.pages
                  )
                    props.onPage(value);
                }}
              />
            </label>
            <span>/ {props.pages}</span>
            <Button
              isDisabled={!props.ready || props.page >= props.pages}
              onPress={() => props.onPage(props.page + 1)}
            >
              {t("officeNext")}
            </Button>
          </>
        )}
      </div>
      {props.sheets.length > 0 && (
        <div
          role="tablist"
          aria-label={t("officeSheets")}
          className={styles.sheets}
        >
          {props.sheets.map((item, index) => (
            <button
              key={index}
              role="tab"
              type="button"
              aria-selected={props.sheet === index}
              aria-controls={props.panelId}
              tabIndex={props.sheet === index ? 0 : -1}
              onClick={() => props.onSheet(index)}
              onKeyDown={(event) => {
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? props.sheets.length - 1
                      : event.key === "ArrowRight"
                        ? (index + 1) % props.sheets.length
                        : event.key === "ArrowLeft"
                          ? (index + props.sheets.length - 1) %
                            props.sheets.length
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  props.onSheet(next);
                  (
                    event.currentTarget.parentElement?.children[
                      next
                    ] as HTMLButtonElement
                  )?.focus();
                }
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
