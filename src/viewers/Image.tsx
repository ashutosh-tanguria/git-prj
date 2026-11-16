/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- Scrollable image region requires keyboard access. */
import { useRef, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Viewer.module.css";
export default function Image({
  url,
  name,
  onSibling,
}: {
  url: string;
  name: string;
  onSibling?: (direction: number) => void;
}) {
  const [zoom, setZoom] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null),
    start = useRef<{ x: number; y: number; left: number; top: number } | null>(
      null,
    );
  return (
    <section>
      <div className={styles.imageControls}>
        <Button onPress={() => setZoom(null)}>{t("fitPage")}</Button>
        <Button onPress={() => setZoom(1)}>100%</Button>
        <Button onPress={() => setZoom((z) => Math.max(0.25, (z ?? 1) - 0.25))}>
          {t("zoomOut")}
        </Button>
        <Button onPress={() => setZoom((z) => Math.min(4, (z ?? 1) + 0.25))}>
          {t("zoomIn")}
        </Button>
      </div>
      <div
        ref={host}
        className={styles.imagePan}
        tabIndex={0}
        role="region"
        aria-label={name}
        onKeyDown={(e) => {
          if (onSibling && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            e.preventDefault();
            onSibling(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerDown={(e) => {
          start.current = {
            x: e.clientX,
            y: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.scrollLeft =
              start.current.left + start.current.x - e.clientX;
            e.currentTarget.scrollTop =
              start.current.top + start.current.y - e.clientY;
          }
        }}
        onPointerUp={() => {
          start.current = null;
        }}
      >
        <img
          src={url}
          alt={name}
          draggable={false}
          style={
            zoom === null
              ? { maxWidth: "100%", maxHeight: "var(--quicklook-height)" }
              : { maxWidth: "none", zoom }
          }
        />
      </div>
    </section>
  );
}
