import { readFileSync } from "node:fs";
import { approvesLicence } from "./licence-policy.mjs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const [name, pkg] of Object.entries(lock.packages)) {
  if (name && !approvesLicence(pkg.license))
    throw new Error("Review licence: " + name + " " + pkg.license);
}
process.stdout.write("All locked package licences are approved.\n");
