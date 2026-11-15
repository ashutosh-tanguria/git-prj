import { useId, type CSSProperties } from "react";
import styles from "./Primitives.module.css";
export function Meter({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number | null;
  max?: number;
}) {
  const id = useId();
  const percent =
    value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={styles.field}>
      <span id={id}>{label}</span>
      {value === null ? (
        <span>?</span>
      ) : (
        <div
          role="meter"
          aria-labelledby={id}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          className={styles.meter}
          data-tier={percent >= 95 ? "danger" : percent >= 50 ? "warn" : "ok"}
          style={{ "--measured-fill": percent + "%" } as CSSProperties}
        >
          <span className={styles.meterFill} />
          <span className={styles.midTick} />
          <span className={styles.stopTick} />
        </div>
      )}
    </div>
  );
}
