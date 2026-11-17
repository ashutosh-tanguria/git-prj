/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Focusable ARIA separator supports pointer and keyboard resizing. */
import { useRef } from "react";
import styles from "./Sash.module.css";
export function Sash({
  label,
  value,
  min,
  max,
  initial,
  reverse = false,
  onChange,
  onCollapse,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  initial: number;
  reverse?: boolean;
  onChange: (n: number) => void;
  onCollapse: () => void;
}) {
  const start = useRef({ x: 0, value });
  const resize = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div
      className={styles.sash}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onDoubleClick={() => resize(initial)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16;
        if (["Home", "End", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          resize(
            e.key === "Home"
              ? min
              : e.key === "End"
                ? max
                : value + (e.key === "ArrowRight" ? step : -step),
          );
        }
      }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, value };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.dragging = "true";
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          const n =
            start.current.value +
            (e.clientX - start.current.x) * (reverse ? -1 : 1);
          if (n < 80) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            onCollapse();
          } else resize(n);
        }
      }}
      onPointerUp={(e) => {
        delete e.currentTarget.dataset.dragging;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    />
  );
}
