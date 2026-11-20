/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Viewer scopes its help shortcut and ignores editors. */
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { library } from "../services/library";
import { viewerRoute, parseRef, refString } from "../lib/refs";
import { ProviderMark } from "../ui/ProviderMark";
import { useRef } from "react";
import styles from "./Viewer.module.css";
const Media = lazy(() => import("./Media"));
const Office = lazy(() => import("./Office"));
const Delimited = lazy(() => import("./Delimited"));
const Html = lazy(() => import("./Html"));
const Image = lazy(() => import("./Image"));
const Pdf = lazy(() => import("./Pdf"));
const Code = lazy(() =>
  import("./SafeMarkup").then((module) => ({ default: module.SafeCode })),
);
const Markdown = lazy(() => import("./SafeMarkup"));
export function ReadViewer({
  blob,
  name,
  fileKey,
}: {
  blob: Blob;
  name: string;
  fileKey?: string;
}) {
  const help = useRef<HTMLDetailsElement>(null);
  let providerUrl = "";
  try {
    const ref = parseRef(fileKey || "");
    providerUrl =
      "https://github.com/" +
      encodeURIComponent(ref.owner) +
      "/" +
      encodeURIComponent(ref.repo) +
      "/blob/" +
      encodeURIComponent(ref.branch) +
      "/" +
      ref.path.split("/").map(encodeURIComponent).join("/");
  } catch {
    /* A Styleguide specimen has no remote ref. */
  }
  const extension = name.split(".").at(-1)?.toLowerCase();
  const textType = [
    "md",
    "csv",
    "tsv",
    "html",
    "txt",
    "ts",
    "js",
    "json",
    "css",
    "py",
  ].includes(extension || "");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    setError("");
    const value = URL.createObjectURL(
      extension === "svg" ? blob.slice(0, blob.size, "image/svg+xml") : blob,
    );
    setUrl(value);
    let active = true;
    if (textType && blob.size <= 10 * 1048576)
      void blob.text().then((value) => {
        if (active) setText(value);
      });
    return () => {
      active = false;
      URL.revokeObjectURL(value);
    };
  }, [blob, extension, textType]);
  return (
    <section
      className={styles.viewer}
      tabIndex={0}
      aria-label={name}
      onKeyDown={(e) => {
        if (
          e.key === "?" &&
          !(e.target as HTMLElement).closest("input,textarea,select")
        ) {
          e.preventDefault();
          if (help.current) {
            help.current.open = true;
            help.current.querySelector("summary")?.focus();
          }
        }
      }}
    >
      <header>
        <h2>{name}</h2>
        <ProviderMark provider="github" label={t("github")} />
        <a href={url} download={name}>
          {t("download")}
        </a>
        <Button
          onPress={() => {
            const link = new URL(location.href);
            if (fileKey) link.hash = viewerRoute(parseRef(fileKey));
            void navigator.clipboard.writeText(link.href);
          }}
        >
          {t("copyLink")}
        </Button>
        <Button
          isDisabled={!fileKey}
          onPress={() => {
            if (fileKey)
              void navigator.clipboard.writeText(refString(parseRef(fileKey)));
          }}
        >
          {t("copyPath")}
        </Button>
        {providerUrl && (
          <a href={providerUrl} target="_blank" rel="noopener noreferrer">
            {t("openProvider")}
          </a>
        )}
        <details ref={help}>
          <summary aria-label={t("keyboardHelp")}>?</summary>
          <p>{t("readShortcuts")}</p>
          {["mp4", "webm", "mp3", "wav", "ogg", "m4a"].includes(
            extension || "",
          ) && <p>{t("previewHelp")}</p>}
        </details>
      </header>
      {error && <p role="alert">{error}</p>}
      <Suspense fallback={<p role="status">{t("loadingRead")}</p>}>
        {textType && blob.size > 10 * 1048576 ? (
          <p>{t("textLimit")}</p>
        ) : [
            "docx",
            "doc",
            "ppt",
            "pptx",
            "xlsx",
            "odt",
            "ods",
            "odp",
          ].includes(extension || "") ? (
          <Office blob={blob} name={name} />
        ) : extension === "pdf" ? (
          <Pdf
            key={fileKey || name}
            blob={blob}
            fileKey={fileKey || location.hash + "/" + name}
          />
        ) : ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(
            extension || "",
          ) ? (
          <Image
            url={url}
            name={name}
            onSibling={
              fileKey && location.hash.startsWith("#/view/")
                ? (direction) => {
                    const previous = location.hash;
                    void library
                      .imageSibling(parseRef(fileKey), direction)
                      .then((ref) => {
                        if (ref && location.hash === previous)
                          location.hash = viewerRoute(ref);
                      })
                      .catch(() => {
                        if (location.hash === previous)
                          setError(t("readError"));
                      });
                  }
                : undefined
            }
          />
        ) : ["mp4", "webm", "mp3", "wav", "ogg", "m4a"].includes(
            extension || "",
          ) ? (
          <Media
            url={url}
            name={name}
            audio={["mp3", "wav", "ogg", "m4a"].includes(extension || "")}
          />
        ) : ["csv", "tsv"].includes(extension || "") ? (
          <Delimited text={text} separator={extension === "tsv" ? "\t" : ","} />
        ) : extension === "html" ? (
          <Html text={text} />
        ) : extension === "md" ? (
          <Markdown text={text} fileRef={fileKey} />
        ) : ["txt", "ts", "js", "json", "css", "html", "py"].includes(
            extension || "",
          ) ? (
          <Code
            text={blob.size > 10 * 1048576 ? t("textLimit") : text}
            language={extension || "txt"}
            plain={blob.size > 2 * 1048576}
          />
        ) : (
          <p>{t("unsupported")}</p>
        )}
      </Suspense>
    </section>
  );
}
