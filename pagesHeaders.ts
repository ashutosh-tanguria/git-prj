import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

export function exactOrigin(value: string, key: string, loopback = false) {
  if (!value) return "";
  const url = new URL(value);
  if (
    url.origin !== value ||
    (url.protocol !== "https:" &&
      !(
        loopback &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  ) {
    throw Error(
      key + " must be an exact HTTPS origin or an allowed local test origin",
    );
  }
  return value;
}

export function pagesHeaders(
  file: string,
  origins: Record<string, string>,
  applyInDev = false,
): Plugin {
  let source = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (const [key, origin] of Object.entries(origins)) {
    source = source.replace(" __" + key + "__", origin ? " " + origin : "");
  }
  const rules = source
    .trimEnd()
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const [path, ...lines] = block.split(/\r?\n/);
      return { path, lines: lines.map((line) => line.trim()) };
    });

  const middleware: import("vite").Connect.NextHandleFunction = (
    request,
    response,
    next,
  ) => {
    const path = request.url?.split("?")[0] ?? "/";
    for (const rule of rules) {
      if (
        rule.path.endsWith("*")
          ? !path.startsWith(rule.path.slice(0, -1))
          : path !== rule.path
      )
        continue;
      for (const line of rule.lines) {
        if (line.startsWith("! ")) response.removeHeader(line.slice(2));
        else {
          const split = line.indexOf(":");
          response.setHeader(
            line.slice(0, split),
            line.slice(split + 1).trim(),
          );
        }
      }
    }
    next();
  };
  return {
    name: "shelf-pages-headers",
    configureServer(server) {
      if (applyInDev) server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source });
    },
  };
}
