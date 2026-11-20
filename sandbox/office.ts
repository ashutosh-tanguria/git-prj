import { validChannel, validManifest, MAX_BYTES } from "./protocol";
import DOMPurify from "dompurify";
import "./office.css";

const root = document.querySelector<HTMLElement>("#document")!;
let active = false;
window.addEventListener("message", (event: MessageEvent) => {
  if (
    active ||
    event.source !== parent ||
    event.origin !== __APP_ORIGIN__ ||
    event.data?.type !== "init" ||
    !validChannel(event.data.channel) ||
    !validManifest(event.data.files) ||
    event.data.files.length !== 1 ||
    event.ports.length !== 1
  )
    return;
  const { channel, files } = event.data;
  const file = files[0] as { path: string; size: number };
  if (!/\.docx$/i.test(file.path)) return;
  active = true;
  const port = event.ports[0];
  port.onmessage = async ({ data }: MessageEvent) => {
    if (
      data?.channel !== channel ||
      data.type !== "file" ||
      data.path !== file.path
    )
      return;
    port.onmessage = null;
    try {
      if (
        !(data.bytes instanceof ArrayBuffer) ||
        data.bytes.byteLength !== file.size ||
        data.bytes.byteLength > MAX_BYTES
      )
        throw Error("limit");
      const target = document.createElement("div");
      const { renderAsync } = await import("docx-preview");
      await renderAsync(data.bytes, target, undefined, {
        renderAltChunks: false,
        useBase64URL: true,
        ignoreFonts: true,
      });
      DOMPurify.sanitize(target, {
        IN_PLACE: true,
        ADD_TAGS: ["style"],
        FORBID_TAGS: [
          "script",
          "iframe",
          "object",
          "embed",
          "form",
          "input",
          "svg",
          "math",
        ],
        FORBID_ATTR: ["href", "srcset", "target"],
      });
      root.replaceChildren(target);
      port.postMessage({
        type: "rendered",
        channel,
        pages: target.querySelectorAll("section.docx").length || 1,
      });
    } catch (error) {
      root.replaceChildren();
      port.postMessage({
        type: "error",
        channel,
        code:
          error instanceof Error && error.message === "limit"
            ? "limit"
            : "corrupt",
      });
    }
  };
  port.start();
  port.postMessage({ type: "need", channel, path: file.path });
});
parent.postMessage({ type: "sandbox-ready" }, __APP_ORIGIN__);
