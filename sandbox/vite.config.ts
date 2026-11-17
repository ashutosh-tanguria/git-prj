import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig(({ command }) => {
  const app =
    process.env.SHELF_APP_ORIGIN ||
    (command === "serve" ? "http://127.0.0.1:5173" : "");
  if (!app || new URL(app).origin !== app)
    throw Error("Set SHELF_APP_ORIGIN to the exact app origin");
  const headers = {
    "Content-Security-Policy": `default-src 'none'; script-src 'self'; style-src 'self'; frame-src 'self'; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${app}`,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
  };
  return {
    root: resolve("sandbox"),
    define: { __APP_ORIGIN__: JSON.stringify(app) },
    server: { host: "127.0.0.1", port: 5174, headers },
    preview: { headers, port: 4174, host: "127.0.0.1" },
    plugins: [
      {
        name: "sandbox-headers",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "_headers",
            source:
              "/*\n" +
              Object.entries(headers)
                .map(([key, value]) => `  ${key}: ${value}`)
                .join("\n") +
              "\n",
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          shell: resolve("sandbox/index.html"),
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
