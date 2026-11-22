import { msw } from "msw/vite";
import {
  ONE_DRIVE_DOWNLOAD_SUFFIX,
  ONE_DRIVE_UPLOAD_SUFFIX,
} from "./src/providers/onedrive/hosts.ts";
import { defineConfig } from "vite";
export default defineConfig(({ mode }) => {
  const sandbox =
    process.env.VITE_SANDBOX_ORIGIN ||
    (mode === "styleguide" ? "http://127.0.0.1:4174" : "");
  if (
    sandbox &&
    (new URL(sandbox).origin !== sandbox ||
      !["https:", "http:"].includes(new URL(sandbox).protocol))
  )
    throw Error("VITE_SANDBOX_ORIGIN must be an exact HTTP(S) origin");
  const headers = {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com; connect-src 'self' https://api.github.com https://www.googleapis.com https://accounts.google.com https://api.dropboxapi.com https://content.dropboxapi.com https://graph.microsoft.com https://login.microsoftonline.com https://*" +
      ONE_DRIVE_DOWNLOAD_SUFFIX +
      " https://*" +
      ONE_DRIVE_UPLOAD_SUFFIX +
      "; worker-src 'self' blob:; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; media-src 'self' blob:; img-src 'self' blob: data:; frame-src blob: https://accounts.google.com https://login.microsoftonline.com" +
      (sandbox ? " " + sandbox : "") +
      "; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
  };
  return {
    preview: { headers },
    define: { __STYLEGUIDE__: JSON.stringify(mode === "styleguide") },
    plugins: [
      msw(),
      {
        name: "app-opener-policy",
        configurePreviewServer(server) {
          server.middlewares.use((request, response, next) => {
            if (request.url?.split("?")[0] !== "/onedrive-callback.html") {
              response.setHeader(
                "Cross-Origin-Opener-Policy",
                "same-origin-allow-popups",
              );
            }
            next();
          });
        },
      },
      {
        name: "app-security-headers",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "_headers",
            source:
              "/*\n" +
              Object.entries(headers)
                .map(([key, value]) => `  ${key}: ${value}`)
                .join("\n") +
              "\n  Cross-Origin-Opener-Policy: same-origin-allow-popups\n\n/onedrive-callback.html\n  ! Cross-Origin-Opener-Policy\n",
          });
        },
      },
    ],
    build: {
      manifest: true,
      rollupOptions: {
        input: { main: "index.html", onedrive: "onedrive-callback.html" },
      },
      outDir: mode === "styleguide" ? "dist-styleguide" : "dist",
    },
  };
});
