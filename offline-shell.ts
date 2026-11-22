import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export function offlineShell(): Plugin {
  return {
    name: "shelf-offline-shell",
    apply: "build",
    generateBundle(_, bundle) {
      const files = new Set(["index.html"]);
      const include = (name: string) => {
        if (files.has(name)) return;
        files.add(name);
        const chunk = bundle[name];
        if (chunk?.type !== "chunk") return;
        for (const dependency of chunk.imports) include(dependency);
        for (const stylesheet of chunk.viteMetadata?.importedCss ?? [])
          files.add(stylesheet);
      };
      const startup = [
        "/index.html",
        "/src/screens/Library.tsx",
        "/src/components/CloudIntegration.tsx",
        "/src/components/LibraryCommands.tsx",
        "/src/components/WorkingCopy.tsx",
        "/src/components/TransferIntegration.tsx",
        "/src/components/LocalFolderTools.tsx",
        "/src/components/SiteEntry.tsx",
        "/src/components/GuardController.tsx",
        "/src/components/IndexingStatus.tsx",
        "/src/services/githubCache.ts",
      ];
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === "chunk" &&
          startup.some((path) => asset.facadeModuleId?.endsWith(path))
        )
          include(asset.fileName);
        if (asset.fileName.endsWith(".woff2")) files.add(asset.fileName);
      }
      const worker = readFileSync(
        new URL("./src/services/offline-app.js", import.meta.url),
        "utf8",
      ).replace(/^\uFEFF/, "");
      const build = createHash("sha256")
        .update([...files].join("\n"))
        .update(worker)
        .digest("hex")
        .slice(0, 16);
      this.emitFile({
        type: "asset",
        fileName: "offline-app.js",
        source:
          "const BUILD_ID = " +
          JSON.stringify(build) +
          ", SHELL_ASSETS = " +
          JSON.stringify([...files]) +
          ";\n" +
          worker,
      });
    },
  };
}
