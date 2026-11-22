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
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === "chunk" &&
          (asset.facadeModuleId?.endsWith("/src/screens/Library.tsx") ||
            asset.facadeModuleId?.endsWith("/index.html"))
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
