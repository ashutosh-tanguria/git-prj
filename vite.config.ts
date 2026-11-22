import { msw } from "msw/vite";
import { defineConfig, loadEnv } from "vite";
import { exactOrigin, pagesHeaders } from "./pagesHeaders.ts";
import { shelfPwa } from "./pwa.ts";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const styleguide = mode === "styleguide";
  const sandbox = exactOrigin(
    env.VITE_SANDBOX_ORIGIN || (styleguide ? "http://127.0.0.1:4174" : ""),
    "VITE_SANDBOX_ORIGIN",
    true,
  );
  const worker = exactOrigin(
    env.VITE_OAUTH_WORKER_URL || "",
    "VITE_OAUTH_WORKER_URL",
  );
  const outDir = styleguide ? "dist-styleguide" : "dist";
  return {
    preview: { cors: false },
    define: { __STYLEGUIDE__: JSON.stringify(styleguide) },
    plugins: [
      msw(),
      shelfPwa(outDir),
      pagesHeaders("public/_headers", {
        SANDBOX_ORIGIN: sandbox,
        WORKER_ORIGIN: worker,
      }),
      ...(command === "serve"
        ? [
            {
              name: "github-static-callback",
              configureServer(server: import("vite").ViteDevServer) {
                server.middlewares.use((request, response, next) => {
                  const path = request.url?.split("?")[0];
                  if (
                    path === "/auth/github/" ||
                    path === "/auth/github/index.html"
                  ) {
                    response.setHeader("Cache-Control", "no-store");
                    response.setHeader("Referrer-Policy", "no-referrer");
                    request.url = "/auth/github/index.html";
                  }
                  next();
                });
              },
            },
          ]
        : []),
    ],
    worker: { format: "es" },
    build: {
      manifest: true,
      rollupOptions: {
        input: { main: "index.html", onedrive: "onedrive-callback.html" },
      },
      outDir,
    },
  };
});
