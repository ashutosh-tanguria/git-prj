import { validChannel, validManifest } from "./protocol";
const appOrigin = __APP_ORIGIN__;
let active = false;
window.addEventListener("message", async (event: MessageEvent) => {
  if (
    active ||
    event.origin !== appOrigin ||
    event.source !== parent ||
    event.data?.type !== "init" ||
    !validChannel(event.data.channel) ||
    !validManifest(event.data.files) ||
    event.ports.length !== 1 ||
    typeof event.data.blocked !== "boolean"
  )
    return;
  const { channel, files, blocked, entry } = event.data;
  if (
    !files.some(
      (file: { path: string }) => file.path === entry && /\.html?$/.test(entry),
    )
  )
    return;
  active = true;
  const port = event.ports[0];
  try {
    await navigator.serviceWorker.register(
      import.meta.env.DEV ? "/sw.ts" : "/sw.js",
      { type: "module" },
    );
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    }
    const worker = navigator.serviceWorker.controller;
    if (!worker) throw Error("worker");
    navigator.serviceWorker.addEventListener("message", function ready(event) {
      if (
        event.source !== worker ||
        event.data?.channel !== channel ||
        event.data.type !== "mounted"
      )
        return;
      navigator.serviceWorker.removeEventListener("message", ready);
      // Navigate the frame itself. Repository code's parent is origin A, never a same-origin shell.
      location.replace("/vfs/" + channel + "/" + entry);
    });
    worker.postMessage({ type: "mount", channel, files, blocked }, [port]);
  } catch {
    port.postMessage({ type: "error", channel });
  }
});
parent.postMessage({ type: "sandbox-ready" }, appOrigin);
