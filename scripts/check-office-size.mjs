import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
for (const file of readdirSync("sandbox/dist/assets").filter((file) =>
  file.endsWith(".js"),
)) {
  const size = gzipSync(readFileSync("sandbox/dist/assets/" + file)).length;
  // README 11: the accepted PPTX renderer bundles its chart runtime.
  const cap = file.startsWith("pptx-preview.es-") ? 400 * 1024 : 250 * 1024;
  if (size > cap)
    throw Error("Office chunk exceeds its documented budget: " + file);
  process.stdout.write(file + ": " + size + " bytes gzip\n");
}
