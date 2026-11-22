import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const files = readdirSync("dist/assets").filter((file) => file.endsWith(".js"));
// Count the bootstrap and Explorer shell with their static dependencies.
// Optional dynamic features are governed by the separate lazy-viewer budget.
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const shell = new Set();
function include(key) {
  const chunk = manifest[key];
  if (!chunk || shell.has(chunk.file)) return;
  shell.add(chunk.file);
  for (const dependency of chunk.imports || []) include(dependency);
}
include("index.html");
include("src/screens/Library.tsx");
const size = files
  .filter((file) => shell.has("assets/" + file))
  .reduce(
    (total, file) =>
      total + gzipSync(readFileSync("dist/assets/" + file)).length,
    0,
  );
if (size > 150 * 1024) throw new Error("Shell exceeds 150 KB gzip: " + size);
for (const file of files)
  if (
    !shell.has("assets/" + file) &&
    !file.startsWith("Pdf-") &&
    !file.startsWith("pdf.worker") &&
    gzipSync(readFileSync("dist/assets/" + file)).length > 250 * 1024
  )
    throw new Error("Lazy chunk exceeds 250 KB gzip: " + file);
for (const file of files)
  if (
    /Styleguide|operating-systems.week-03|Sample content/.test(
      readFileSync("dist/assets/" + file, "utf8"),
    )
  )
    throw new Error("Sample workbench leaked into production");
process.stdout.write(
  "Production shell JS: " + size + " bytes gzip; no Styleguide samples.\n",
);
