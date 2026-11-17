import {
  validChannel,
  validManifest,
  MAX_BYTES,
  type VirtualFile,
} from "../../sandbox/protocol";
export function sandboxOrigin(value: string, app = location.origin): string {
  const url = new URL(value);
  if (url.origin !== value || url.origin === app) throw Error("siteOrigin");
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  const appUrl = new URL(app);
  const site = (host: string) =>
    host.endsWith(".pages.dev") ? host : host.split(".").slice(-2).join(".");
  if (
    !local &&
    (url.protocol !== "https:" || site(url.hostname) === site(appUrl.hostname))
  )
    throw Error("siteOrigin");
  if (local && !["127.0.0.1", "localhost"].includes(appUrl.hostname))
    throw Error("siteOrigin");
  return url.origin;
}
export interface SiteEvent {
  type: "request" | "console" | "error";
  path?: string;
  status?: string;
}
export function startSiteSession(
  frame: HTMLIFrameElement,
  origin: string,
  files: VirtualFile[],
  entry: string,
  blocked: boolean,
  read: (path: string, signal: AbortSignal) => Promise<ArrayBuffer>,
  report: (event: SiteEvent) => void,
): () => void {
  sandboxOrigin(origin);
  if (!validManifest(files) || !files.some((file) => file.path === entry))
    throw Error("siteLimit");
  const channel = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const controller = new AbortController();
  const bridge = new MessageChannel();
  const sent = new Set<string>();
  let total = 0,
    initialized = false;
  const timeout = setTimeout(() => {
    if (!initialized) report({ type: "error" });
  }, 15000);
  const receive = (event: MessageEvent) => {
    if (
      event.source === frame.contentWindow &&
      event.origin === origin &&
      event.data?.type === "site-report"
    ) {
      const { kind, path } = event.data;
      if (["request", "console"].includes(kind) && typeof path === "string")
        report({ type: kind, path: path.slice(0, 2048), status: "blocked" });
      return;
    }
    if (
      initialized ||
      event.source !== frame.contentWindow ||
      event.origin !== origin ||
      event.data?.type !== "sandbox-ready"
    )
      return;
    initialized = true;
    clearTimeout(timeout);
    frame.contentWindow?.postMessage(
      {
        type: "init",
        channel,
        files: files.map(({ path, size }) => ({ path, size })),
        entry,
        blocked,
      },
      origin,
      [bridge.port2],
    );
  };
  window.addEventListener("message", receive);
  bridge.port1.onmessage = async ({ data }: MessageEvent) => {
    if (
      !validChannel(data?.channel) ||
      data.channel !== channel ||
      controller.signal.aborted
    )
      return;
    if (data.type === "need") {
      const file = files.find((file) => file.path === data.path);
      if (!file || sent.has(file.path)) return;
      sent.add(file.path);
      try {
        const bytes = await read(file.path, controller.signal);
        if (controller.signal.aborted) return;
        if (
          bytes.byteLength !== file.size ||
          total + bytes.byteLength > MAX_BYTES
        )
          throw Error("siteLimit");
        total += bytes.byteLength;
        bridge.port1.postMessage(
          { type: "file", channel, path: file.path, bytes },
          [bytes],
        );
      } catch {
        if (!controller.signal.aborted) {
          bridge.port1.postMessage({ type: "file", channel, path: file.path });
          report({ type: "request", path: file.path, status: "failed" });
        }
      }
    } else if (
      ["request", "console"].includes(data.type) &&
      typeof data.path === "string" &&
      data.path.length <= 2048
    ) {
      report({
        type: data.type,
        path: data.path,
        status: data.status === "blocked" ? "blocked" : "failed",
      });
    } else if (data.type === "error") report({ type: "error" });
  };
  bridge.port1.start();
  frame.src = origin + "/";
  return () => {
    controller.abort();
    clearTimeout(timeout);
    window.removeEventListener("message", receive);
    bridge.port1.postMessage({ type: "stop", channel });
    bridge.port1.close();
    frame.src = "about:blank";
  };
}
