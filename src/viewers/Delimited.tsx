/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable table requires keyboard access. */
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { delimited } from "../lib/delimited";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Viewer.module.css";
export default function Delimited({
  text,
  separator,
}: {
  text: string;
  separator: string;
}) {
  const [all, setAll] = useState(false),
    [confirm, setConfirm] = useState(false);
  const data = useMemo(
    () => delimited(text, separator, all ? Infinity : 5000),
    [text, separator, all],
  );
  const host = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: data.rows.length,
    getScrollElement: () => host.current,
    estimateSize: () => 32,
    overscan: 6,
  });
  return (
    <section>
      <p>
        {t("rowsShown")} {data.rows.length} / {data.total}
      </p>
      {!all && data.total > 5000 && (
        <Button
          onPress={() =>
            data.total > 100000 ? setConfirm(true) : setAll(true)
          }
        >
          {t("openAllRows")}
        </Button>
      )}
      {confirm && (
        <div role="alert">
          <p>{t("manyRows")}</p>
          <Button
            onPress={() => {
              setAll(true);
              setConfirm(false);
            }}
          >
            {t("openAllRows")}
          </Button>
          <Button onPress={() => setConfirm(false)}>{t("cancel")}</Button>
        </div>
      )}
      <div
        ref={host}
        className={styles.csv}
        tabIndex={0}
        role="region"
        aria-label={t("dataTable")}
      >
        <div
          role="table"
          aria-label={t("dataTable")}
          aria-rowcount={data.total}
          style={{ height: virtual.getTotalSize() }}
        >
          {virtual.getVirtualItems().map((item) => (
            <div
              key={item.key}
              role="row"
              aria-rowindex={item.index + 1}
              className={styles.csvRow}
              style={{ top: item.start, height: item.size }}
            >
              {data.rows[item.index].map((value, i) => (
                <span role="cell" key={i} title={value}>
                  {value}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
