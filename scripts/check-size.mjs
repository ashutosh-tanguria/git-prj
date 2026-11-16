import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const files = readdirSync("dist/assets").filter((file) => file.endsWith(".js"));
const size = files.filter(file=>!file.startsWith("Pdf-")&&!file.startsWith("pdf.worker")&&!file.startsWith("SafeMarkup-")).reduce(
  (total, file) => total + gzipSync(readFileSync("dist/assets/" + file)).length,
  0,
);
if (size > 150 * 1024) throw new Error("Shell exceeds 150 KB gzip: " + size);
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
