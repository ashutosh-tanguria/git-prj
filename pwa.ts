import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import type { Manifest } from "vite";

const startup = [
  "index.html",
  "src/screens/Library.tsx",
  "src/components/PwaUpdate.tsx",
  "src/components/GitHubSignIn.tsx",
  "src/components/CloudIntegration.tsx",
  "src/components/LibraryCommands.tsx",
  "src/components/WorkingCopy.tsx",
  "src/components/TransferIntegration.tsx",
  "src/components/LocalFolderTools.tsx",
  "src/components/SiteEntry.tsx",
  "src/components/GuardController.tsx",
  "src/components/IndexingStatus.tsx",
  "src/components/LibraryExplorerViews.tsx",
  "src/components/LibraryTools.tsx",
  "src/components/MixedExplorer.tsx",
  "src/components/OrganizerEditor.tsx",
  "src/components/ViewMenu.tsx",
  "src/services/githubCache.ts",
];

export function shelfPwa(outDir: string) {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const canvas = tokens.match(/--canvas:\s*(#[\da-f]+);/i)?.[1];
  return [
    {
      name: "shelf-pwa-theme",
      transformIndexHtml(
        _html: string,
        context: import("vite").IndexHtmlTransformContext,
      ) {
        if (context.path === "/index.html" && canvas)
          return [
            {
              tag: "meta",
              attrs: { name: "theme-color", content: canvas },
              injectTo: "head" as const,
            },
          ];
      },
    },
    ...VitePWA({
      filename: "offline-app.js",
      injectRegister: null,
      includeManifestIcons: false,
      manifest: {
        id: "/",
        name: "Shelf",
        short_name: "Shelf",
        description: "Browse and organize your connected files.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: canvas,
        background_color: canvas,
        icons: [
          { src: "/icons/shelf-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icons/shelf-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        inlineWorkboxRuntime: true,
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/(?:index\.html)?$/],
        globPatterns: ["index.html", "assets/*.{css,js,woff2}"],
        manifestTransforms: [
          async (entries) => {
            const built = JSON.parse(
              readFileSync(resolve(outDir, ".vite/manifest.json"), "utf8"),
            ) as Manifest;
            const files = new Set(["index.html"]);
            const seen = new Set<string>();
            function include(key: string) {
              if (seen.has(key)) return;
              seen.add(key);
              const asset = built[key];
              if (!asset) return;
              files.add(asset.file);
              for (const css of asset.css ?? []) files.add(css);
              for (const dependency of asset.imports ?? []) include(dependency);
            }
            for (const key of startup) include(key);
            return {
              manifest: entries.filter(
                ({ url }) => files.has(url) || url.endsWith(".woff2"),
              ),
              warnings: [],
            };
          },
        ],
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "shelf-immutable-assets",
              matchOptions: { ignoreVary: true },
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 90 },
            },
          },
        ],
      },
    }),
  ];
}
