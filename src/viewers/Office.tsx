import "../i18n/office";
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { startOfficeSession } from "../services/officeSession";
import styles from "./Office.module.css";

export default function Office({ blob, name }: { blob: Blob; name: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("officeLoading");
  const supported = /\.docx$/i.test(name);
  const limit = blob.size > 50 * 1024 * 1024;
  useEffect(() => {
    if (!supported || limit || !frame.current) return;
    setStatus("officeLoading");
    let stop: (() => void) | undefined;
    try {
      const origin =
        import.meta.env.VITE_SANDBOX_ORIGIN ||
        (__STYLEGUIDE__
          ? "http://127.0.0.1:4174"
          : import.meta.env.DEV
            ? "http://127.0.0.1:5174"
            : "");
      stop = startOfficeSession(frame.current, origin, name, blob, (event) =>
        setStatus(event.type === "rendered" ? "" : "office" + event.code),
      );
    } catch {
      setStatus("officeUnavailable");
    }
    return () => stop?.();
  }, [blob, name, supported, limit]);
  return (
    <div className={styles.office}>
      <p>
        {name} | {new Intl.NumberFormat().format(blob.size)} {t("officeBytes")}
      </p>
      {(!supported || limit || status) && (
        <p role="status">
          {t(!supported ? "officeUnsupported" : limit ? "officelimit" : status)}
        </p>
      )}
      {supported && !limit && (
        <iframe
          ref={frame}
          title={t("officeTitle")}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
