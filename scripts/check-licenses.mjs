import { readFileSync } from "node:fs";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const allowed = new Set([
  "MIT", "MIT-0", "PSF-2.0", "CC0-1.0",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "OFL-1.1",
  "MPL-2.0",
  "Python-2.0",
  "CC-BY-4.0",
  "BlueOak-1.0.0",
  "(MIT OR CC0-1.0)",
  "(MIT AND BSD-3-Clause)",
  "(MPL-2.0 OR Apache-2.0)",
]);
for (const [name, pkg] of Object.entries(lock.packages))
  if (name && (!pkg.license || !allowed.has(pkg.license)))
    throw new Error("Review licence: " + name + " " + pkg.license);
process.stdout.write("All locked package licences are approved.\n");
