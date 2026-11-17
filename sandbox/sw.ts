/// <reference lib="webworker" />
import {
  MAX_BYTES,
  mime,
  siteCsp,
  validChannel,
  validManifest,
  validPath,
  instrumentHtml,
  type VirtualFile,
} from "./protocol";
const worker = globalThis as unknown as ServiceWorkerGlobalScope;
interface Session {
  owner: string;
  port: MessagePort;
  files: VirtualFile[];
  blocked: boolean;
  bytes: number;
  pending: Map<
    string,
    {
      resolve: (data?: ArrayBuffer) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >;
  cache: Map<string, ArrayBuffer>;
}
const sessions = new Map<string, Session>();
function dispose(channel: string) {
  const session = sessions.get(channel);
  if (!session) return;
  session.pending.forEach((item) => {
    clearTimeout(item.timer);
    item.resolve();
  });
  session.port.close();
  sessions.delete(channel);
}
worker.addEventListener("install", () => {
  void worker.skipWaiting();
});
worker.addEventListener("activate", (event) =>
  event.waitUntil(worker.clients.claim()),
);
worker.addEventListener("message", (event) => {
  const data = event.data;
  const source = event.source as Client | null;
  // Only the exact trusted shell, never a virtual document, can mount or stop.
  if (
    !source ||
    new URL(source.url).pathname !== "/" ||
    !validChannel(data?.channel)
  )
    return;
  if (data.type === "stop") {
    const session = sessions.get(data.channel);
    if (session?.owner === source.id) {
      dispose(data.channel);
    }
    return;
  }
  if (
    data.type !== "mount" ||
    !validManifest(data.files) ||
    event.ports.length !== 1 ||
    typeof data.blocked !== "boolean" ||
    sessions.has(data.channel)
  )
    return;
  const session: Session = {
    owner: source.id,
    port: event.ports[0],
    files: data.files,
    blocked: data.blocked,
    bytes: 0,
    pending: new Map(),
    cache: new Map(),
  };
  sessions.set(data.channel, session);
  session.port.onmessage = ({ data: reply }) => {
    if (reply?.channel === data.channel && reply.type === "stop") {
      dispose(data.channel);
      return;
    }
    if (
      reply?.channel !== data.channel ||
      reply.type !== "file" ||
      !validPath(reply.path)
    )
      return;
    const item = session.pending.get(reply.path);
    if (!item) return;
    clearTimeout(item.timer);
    session.pending.delete(reply.path);
    const file = session.files.find((file) => file.path === reply.path);
    if (
      !(reply.bytes instanceof ArrayBuffer) ||
      !file ||
      reply.bytes.byteLength !== file.size ||
      session.bytes + reply.bytes.byteLength > MAX_BYTES
    ) {
      item.resolve();
      return;
    }
    session.bytes += reply.bytes.byteLength;
    session.cache.set(reply.path, reply.bytes);
    item.resolve(reply.bytes);
  };
  source.postMessage({ type: "mounted", channel: data.channel });
});
function load(
  session: Session,
  channel: string,
  path: string,
): Promise<ArrayBuffer | undefined> {
  const cached = session.cache.get(path);
  if (cached) return Promise.resolve(cached);
  // Requests for the same asset share one pending promise through the cache on retry.
  if (session.pending.has(path))
    return new Promise((resolve) =>
      setTimeout(() => resolve(load(session, channel, path)), 30),
    );
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      session.pending.delete(path);
      resolve(undefined);
    }, 15000);
    session.pending.set(path, { resolve, timer });
    session.port.postMessage({ type: "need", channel, path });
  });
}
worker.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const url = new URL(event.request.url);
      const client = event.clientId
        ? await worker.clients.get(event.clientId)
        : undefined;
      const clientPath = client ? new URL(client.url).pathname : "";
      const match = /^\/vfs\/([a-f0-9]{64})\/(.*)$/.exec(url.pathname);
      const clientChannel = /^\/vfs\/([a-f0-9]{64})\//.exec(clientPath)?.[1];
      const channel = match?.[1] || clientChannel;
      if (!channel) return fetch(event.request);
      const session = sessions.get(channel);
      const report = (status: string, path: string) =>
        session?.port.postMessage({ type: "request", channel, status, path });
      if (!session) return new Response("Stopped", { status: 410 });
      if (url.origin !== worker.location.origin) {
        if (session.blocked || url.origin === __APP_ORIGIN__) {
          report("blocked", url.origin);
          return Response.error();
        }
        try {
          return await fetch(event.request, {
            credentials: "omit",
            referrerPolicy: "no-referrer",
          });
        } catch {
          report("failed", url.origin);
          return Response.error();
        }
      }
      let path: string;
      try {
        path = decodeURIComponent(match ? match[2] : url.pathname.slice(1));
      } catch {
        return new Response("Invalid path", { status: 400 });
      }
      if (!path || path.endsWith("/")) path += "index.html";
      if (!validPath(path))
        return new Response("Invalid path", { status: 400 });
      if (path === "__shelf_monitor.js")
        return new Response(
          `
      addEventListener('securitypolicyviolation', e => parent.postMessage({type:'site-report',kind:'request',path:e.blockedURI}, ${JSON.stringify(__APP_ORIGIN__)}));
      addEventListener('error', e => parent.postMessage({type:'site-report',kind:'console',path:e.message || 'Resource failed'}, ${JSON.stringify(__APP_ORIGIN__)}), true);
      addEventListener('unhandledrejection', () => parent.postMessage({type:'site-report',kind:'console',path:'Unhandled promise rejection'}, ${JSON.stringify(__APP_ORIGIN__)}));
      for (const method of ['log', 'info', 'warn', 'error']) {
        const original = console[method].bind(console);
        console[method] = (...values) => {
          parent.postMessage({type:'site-report',kind:'console',path:values.map(value => typeof value === 'string' ? value : '[value]').join(' ').slice(0, 2048)}, ${JSON.stringify(__APP_ORIGIN__)});
          original(...values);
        };
      }
    `,
          {
            headers: {
              "Content-Type": "text/javascript",
              "Access-Control-Allow-Origin": "*",
              "Cross-Origin-Resource-Policy": "cross-origin",
            },
          },
        );
      if (!session.files.some((file) => file.path === path)) {
        if (
          event.request.mode === "navigate" &&
          !path.split("/").at(-1)?.includes(".")
        )
          path = "index.html";
        else {
          report("failed", path);
          return new Response("Not found", { status: 404 });
        }
      }
      const bytes = await load(session, channel, path);
      if (!bytes) {
        report("failed", path);
        return new Response("Unavailable", { status: 404 });
      }
      const body = /\.html?$/.test(path)
        ? new TextEncoder().encode(
            instrumentHtml(new TextDecoder().decode(bytes), channel),
          )
        : bytes;
      return new Response(body, {
        headers: {
          "Content-Type": mime(path),
          "Content-Security-Policy": siteCsp(
            session.blocked,
            worker.location.origin,
            __APP_ORIGIN__,
          ),
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    })(),
  );
});
