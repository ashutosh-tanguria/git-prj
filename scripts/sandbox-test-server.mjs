import { build, preview } from "vite";
process.env.SHELF_APP_ORIGIN = "http://127.0.0.1:4173";
await build({ configFile: "sandbox/vite.config.ts" });
await preview({
  configFile: "sandbox/vite.config.ts",
  preview: { port: 4174, strictPort: true },
});
