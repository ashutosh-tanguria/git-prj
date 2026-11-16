import { useState } from "react";
import { Button } from "../ui/Button";
import { ReadViewer } from "../viewers/ReadViewer";
import { t } from "../i18n";
import sampleAudio from "../../fixtures/sample-reading-note.wav?url";
import samplePdf from "../../fixtures/sample-complete.pdf?url";
const code = new Blob(
  [
    "// Sample: reading queue\nconst nextChapter = 7;\nconsole.log(nextChapter);",
  ],
  { type: "text/plain" },
);
const image = new Blob(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><title>Sample chapter diagram</title><path d="M80 240h480M320 80v320" stroke="currentColor"/><text x="96" y="220">Sample: replication diagram</text></svg>',
  ],
  { type: "image/svg+xml" },
);
export function SampleViewers() {
  const [file, setFile] = useState({
    blob: code,
    name: "sample-reading-queue.ts",
  });
  const [error, setError] = useState("");
  return (
    <section>
      <h3>{t("sample")}</h3>
      <Button
        onPress={() => setFile({ blob: code, name: "sample-reading-queue.ts" })}
      >
        {t("code")}
      </Button>
      <Button
        onPress={() => setFile({ blob: image, name: "sample-replication.svg" })}
      >
        {t("image")}
      </Button>
      <Button
        onPress={() => {
          void fetch(samplePdf)
            .then((res) => {
              if (!res.ok) throw new Error();
              return res.blob();
            })
            .then((blob) => setFile({ blob, name: "sample-reading.pdf" }))
            .catch(() => setError(t("readError")));
        }}
      >
        {t("pdfReader")}
      </Button>
      <Button
        onPress={() =>
          setFile({
            blob: new Blob([
              "Sample chapter,Pages\nReplication,12\nConsensus,18",
            ]),
            name: "sample-reading.csv",
          })
        }
      >
        {t("dataTable")}
      </Button>
      <Button
        onPress={() =>
          setFile({
            blob: new Blob([
              "<h1>Sample reading notes</h1><p>Replication and consensus.</p>",
            ]),
            name: "sample-reading.html",
          })
        }
      >
        HTML
      </Button>
      <Button
        onPress={() => {
          void fetch(sampleAudio)
            .then((res) => res.blob())
            .then((blob) => setFile({ blob, name: "sample-reading-note.wav" }))
            .catch(() => setError(t("readError")));
        }}
      >
        {t("mediaPlayer")}
      </Button>
      {error && <p role="alert">{error}</p>}
      <ReadViewer key={file.name} blob={file.blob} name={file.name} />
    </section>
  );
}
