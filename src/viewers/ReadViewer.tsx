import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Viewer.module.css";
const Pdf = lazy(() => import("./Pdf"));
const Code = lazy(() =>
  import("./SafeMarkup").then((module) => ({ default: module.SafeCode })),
);
const Markdown = lazy(() => import("./SafeMarkup"));
export function ReadViewer({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(blob);
    setUrl(value);
    let active = true;
    if (blob.size <= 2 * 1048576)
      void blob.text().then((value) => {
        if (active) setText(value);
      });
    return () => {
      active = false;
      URL.revokeObjectURL(value);
    };
  }, [blob]);
  const extension = name.split(".").at(-1)?.toLowerCase();
  return (
    <section className={styles.viewer}>
      <header>
        <h2>{name}</h2>
        <a href={url} download={name}>
          {t("download")}
        </a>
        <Button
          onPress={() => {
            void navigator.clipboard.writeText(location.href);
          }}
        >
          {t("copyLink")}
        </Button>
      </header>
      <Suspense fallback={<p role="status">{t("loadingRead")}</p>}>
        {extension === "pdf" ? (
          <Pdf blob={blob} />
        ) : ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(
            extension || "",
          ) ? (
          <img className={styles.image} src={url} alt={name} />
        ) : extension === "md" ? (
          <Markdown text={text} />
        ) : ["txt", "ts", "js", "json", "css", "html", "py"].includes(
            extension || "",
          ) ? (
          <Code text={text || t("textLimit")} language={extension || "txt"} />
        ) : (
          <p>{t("unsupported")}</p>
        )}
      </Suspense>
    </section>
  );
}
