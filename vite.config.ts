import { defineConfig } from "vite";
export default defineConfig(({ mode }) => ({
  preview: {
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://api.github.com; worker-src 'self' blob:; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  },
  define: { __STYLEGUIDE__: JSON.stringify(mode === "styleguide") },
  build: { manifest: true, outDir: mode === "styleguide" ? "dist-styleguide" : "dist" },
}));
