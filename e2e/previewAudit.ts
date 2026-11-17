import type { BrowserContext } from "@playwright/test";
export async function auditPreviewMessages(context: BrowserContext) {
  const traffic: string[] = [];
  await context.exposeBinding("capturePreviewTraffic", (_, value: string) => {
    traffic.push(value);
  });
  await context.addInitScript(() => {
    const capture = (value: unknown) => {
      void (
        globalThis as unknown as {
          capturePreviewTraffic: (value: string) => Promise<void>;
        }
      ).capturePreviewTraffic(
        JSON.stringify(value, (_, item) =>
          item instanceof ArrayBuffer
            ? { bytes: item.byteLength, text: new TextDecoder().decode(item) }
            : item,
        ),
      );
    };
    window.postMessage = new Proxy(window.postMessage, {
      apply(target, receiver, args: unknown[]) {
        capture(args[0]);
        return Reflect.apply(target, receiver, args);
      },
    });
    MessagePort.prototype.postMessage = new Proxy(
      MessagePort.prototype.postMessage,
      {
        apply(target, receiver, args: unknown[]) {
          capture(args[0]);
          return Reflect.apply(target, receiver, args);
        },
      },
    );
    if (typeof ServiceWorker !== "undefined")
      ServiceWorker.prototype.postMessage = new Proxy(
        ServiceWorker.prototype.postMessage,
        {
          apply(target, receiver, args: unknown[]) {
            capture(args[0]);
            return Reflect.apply(target, receiver, args);
          },
        },
      );
    navigator.serviceWorker?.addEventListener("message", (event) =>
      capture(event.data),
    );
    const descriptor = Object.getOwnPropertyDescriptor(
      MessagePort.prototype,
      "onmessage",
    );
    if (descriptor?.set)
      Object.defineProperty(MessagePort.prototype, "onmessage", {
        ...descriptor,
        set(value: unknown) {
          const handler =
            typeof value === "function"
              ? function (this: MessagePort, event: MessageEvent) {
                  capture(event.data);
                  return Reflect.apply(value, this, [event]);
                }
              : value;
          descriptor.set?.call(this, handler);
        },
      });
    window.addEventListener("message", (event) => capture(event.data));
  });
  return traffic;
}
