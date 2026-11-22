import { defineConfig } from "vite";
import { resolve } from "node:path";
import { exactOrigin, pagesHeaders } from "../pagesHeaders.ts";

export default defineConfig(({ command }) => {
  const app = exactOrigin(
    process.env.SHELF_APP_ORIGIN ||
      (command === "serve" ? "http://127.0.0.1:5173" : ""),
    "SHELF_APP_ORIGIN",
    true,
  );
  if (!app) throw Error("Set SHELF_APP_ORIGIN to the exact app origin");
  return {
    root: resolve("sandbox"),
    define: { __APP_ORIGIN__: JSON.stringify(app) },
    server: { host: "127.0.0.1", port: 5174 },
    preview: { port: 4174, host: "127.0.0.1", cors: false },
    plugins: [
      pagesHeaders("sandbox/public/_headers", { APP_ORIGIN: app }, true),
    ],
    build: {
      rollupOptions: {
        input: {
          shell: resolve("sandbox/index.html"),
          office: resolve("sandbox/office.html"),
          sw: resolve("sandbox/sw.ts"),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === "sw" ? "sw.js" : "assets/[name]-[hash].js",
        },
      },
    },
  };
});
