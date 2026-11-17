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
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://api.github.com; worker-src 'self' blob:; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; media-src 'self' blob:; img-src 'self' blob: data:; frame-src blob:" +
      (sandbox ? " " + sandbox : "") +
      "; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  return {
    preview: { headers },
    define: { __STYLEGUIDE__: JSON.stringify(mode === "styleguide") },
    plugins: [
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
              "\n",
          });
        },
      },
    ],
    build: {
      manifest: true,
      outDir: mode === "styleguide" ? "dist-styleguide" : "dist",
    },
  };
});
