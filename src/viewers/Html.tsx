import { htmlPreview } from "../services/htmlPolicy";
import { useState } from "react";
import { SafeCode } from "./SafeMarkup";
import { Button } from "../ui/Button";
import { t } from "../i18n";
export default function Html({ text }: { text: string }) {
  const [run, setRun] = useState(false);
  return (
    <section>
      <SafeCode text={text} language="html" />
      <Button onPress={() => setRun(!run)}>{t("runPreview")}</Button>
      <p>{t("isolatedHtml")}</p>
      {run && (
        <iframe
          title={t("isolatedHtml")}
          sandbox=""
          srcDoc={
            `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; connect-src 'none'; img-src 'none'; style-src 'none'; form-action 'none'; base-uri 'none'">` +
            htmlPreview(text)
          }
        />
      )}
    </section>
  );
}
