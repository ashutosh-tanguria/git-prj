import type { ReactNode } from "react";
import styles from "./Primitives.module.css";
export type Tone = "neutral" | "info" | "ok" | "warn" | "danger";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      <span aria-hidden="true">
        {
          (
            {
              neutral: "○",
              info: "◆",
              ok: "✓",
              warn: "△",
              danger: "!",
            } as const
          )[tone]
        }
      </span>{" "}
      {children}
    </span>
  );
}
