import { MAX_BYTES, validChannel } from "../../sandbox/protocol";
import { sandboxOrigin } from "./siteSession";

export type OfficeEvent =
  | { type: "shortcut"; key: string }
  | {
      type: "rendered";
      pages: number;
      sheets: { name: string; truncated: boolean }[];
    }
  | { type: "error"; code: "limit" | "corrupt" | "timeout" | "password" };
export function startOfficeSession(
  frame: HTMLIFrameElement,
  origin: string,
  name: string,
  blob: Blob,
  report: (event: OfficeEvent) => void,
) {
  sandboxOrigin(origin);
  if (blob.size > MAX_BYTES) throw Error("limit");
  const channel = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const bridge = new MessageChannel();
  let stopped = false,
    initialized = false,
    sent = false;
  const timeout = setTimeout(
    () => report({ type: "error", code: "timeout" }),
    25000,
  );
  const receive = (event: MessageEvent) => {
    if (
      initialized ||
      event.source !== frame.contentWindow ||
      event.origin !== origin ||
      event.data?.type !== "sandbox-ready"
    )
      return;
    initialized = true;
    frame.contentWindow?.postMessage(
      { type: "init", channel, files: [{ path: name, size: blob.size }] },
      origin,
      [bridge.port2],
    );
  };
  window.addEventListener("message", receive);
  bridge.port1.onmessage = async ({ data }: MessageEvent) => {
    if (stopped || !validChannel(data?.channel) || data.channel !== channel)
      return;
    if (
      data.type === "shortcut" &&
      ["+", "=", "-", "0", "j", "k", "PageDown", "PageUp", "?"].includes(
        data.key,
      )
    ) {
      report({ type: "shortcut", key: data.key });
    } else if (data.type === "need" && data.path === name && !sent) {
      sent = true;
      const bytes = await blob.arrayBuffer();
      if (!stopped)
        bridge.port1.postMessage({ type: "file", channel, path: name, bytes }, [
          bytes,
        ]);
    } else if (
      data.type === "rendered" &&
      Number.isSafeInteger(data.pages) &&
      data.pages > 0
    ) {
      clearTimeout(timeout);
      const sheets = Array.isArray(data.sheets)
        ? data.sheets.filter(
            (sheet: { name?: unknown; truncated?: unknown }) =>
              typeof sheet?.name === "string" &&
              typeof sheet.truncated === "boolean",
          )
        : [];
      report({ type: "rendered", pages: data.pages, sheets });
    } else if (data.type === "error") {
      clearTimeout(timeout);
      report({
        type: "error",
        code: ["limit", "timeout", "password"].includes(data.code)
          ? data.code
          : "corrupt",
      });
    }
  };
  bridge.port1.start();
  frame.src = origin + "/office.html";
  const stop = () => {
    stopped = true;
    clearTimeout(timeout);
    window.removeEventListener("message", receive);
    bridge.port1.close();
    frame.src = "about:blank";
  };
  return Object.assign(stop, {
    command: (type: string, index: number) => {
      if (!stopped) bridge.port1.postMessage({ type, index, channel });
    },
  });
}
