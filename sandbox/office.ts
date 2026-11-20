import { validChannel, validManifest, MAX_BYTES } from "./protocol";
import DOMPurify from "dompurify";
import "./office.css";
import { parseSpreadsheet, type SpreadsheetSheet } from "./spreadsheet";
import { renderSheet } from "./officeSheet";

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
  if (!/\.(docx|xlsx|pptx)$/i.test(file.path)) return;
  active = true;
  const port = event.ports[0];
  let sheets: SpreadsheetSheet[] = [];
  let received = false;
  port.onmessage = async ({ data }: MessageEvent) => {
    if (
      data?.channel === channel &&
      data.type === "sheet" &&
      Number.isSafeInteger(data.index) &&
      sheets[data.index]
    ) {
      renderSheet(root, sheets[data.index]);
      return;
    }
    if (
      data?.channel !== channel ||
      data.type !== "file" ||
      data.path !== file.path
    )
      return;
    if (received) return;
    received = true;
    try {
      if (
        !(data.bytes instanceof ArrayBuffer) ||
        data.bytes.byteLength !== file.size ||
        data.bytes.byteLength > MAX_BYTES
      )
        throw Error("limit");
      if (/\.xlsx$/i.test(file.path)) {
        sheets = await parseSpreadsheet(data.bytes);
        if (!sheets.length) throw Error("corrupt");
        renderSheet(root, sheets[0]);
        port.postMessage({
          type: "rendered",
          channel,
          pages: 1,
          sheets: sheets.map(({ name, truncated }) => ({ name, truncated })),
        });
        return;
      }
      const target = document.createElement("div");
      let pages = 1;
      if (/\.pptx$/i.test(file.path)) {
        const { init } = await import("pptx-preview");
        const preview = init(target, { width: 960, height: 540, mode: "list" });
        await preview.preview(data.bytes);
        pages = preview.slideCount;
        if (!pages) throw Error("corrupt");
      } else {
        const { renderAsync } = await import("docx-preview");
        await renderAsync(data.bytes, target, undefined, {
          renderAltChunks: false,
          useBase64URL: true,
          ignoreFonts: true,
        });
        pages = target.querySelectorAll("section.docx").length || 1;
      }
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
        pages,
      });
    } catch (error) {
      root.replaceChildren();
      port.postMessage({
        type: "error",
        channel,
        code:
          error instanceof Error &&
          ["limit", "password", "timeout"].includes(error.message)
            ? error.message
            : "corrupt",
      });
    }
  };
  port.start();
  port.postMessage({ type: "need", channel, path: file.path });
});
parent.postMessage({ type: "sandbox-ready" }, __APP_ORIGIN__);
