/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/media-has-caption -- User-owned media has no supplied caption track; native controls stay accessible. */
import { t } from "../i18n";
import { useRef, useState } from "react";
import styles from "./Viewer.module.css";
export default function Media({
  url,
  name,
  audio,
}: {
  url: string;
  name: string;
  audio: boolean;
}) {
  const [error, setError] = useState("");
  const media = useRef<HTMLMediaElement | null>(null);
  return (
    <section
      tabIndex={0}
      aria-label={t("mediaPlayer") + ": " + name}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const node = media.current;
        if (!node) return;
        if (e.key === " ") {
          e.preventDefault();
          if (node.paused)
            void node.play().catch(() => setError(t("mediaError")));
          else node.pause();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          node.currentTime = Math.max(
            0,
            Math.min(
              Number.isFinite(node.duration) ? node.duration : Infinity,
              node.currentTime + (e.key === "ArrowRight" ? 5 : -5),
            ),
          );
        } else if (e.key === "f") {
          void e.currentTarget
            .requestFullscreen()
            .catch(() => setError(t("mediaError")));
        }
      }}
    >
      {error && <p role="alert">{error}</p>}
      {audio ? (
        <audio
          ref={(node) => {
            media.current = node;
          }}
          onError={() => setError(t("mediaError"))}
          controls
          src={url}
          aria-label={name}
        />
      ) : (
        <video
          className={styles.media}
          ref={(node) => {
            media.current = node;
          }}
          onError={() => setError(t("mediaError"))}
          controls
          src={url}
          aria-label={name}
        />
      )}
    </section>
  );
}
