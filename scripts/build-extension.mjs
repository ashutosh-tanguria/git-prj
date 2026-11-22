import { mkdir, readFile, writeFile } from "node:fs/promises";
import { downloadZip } from "client-zip";

const app = process.env.APP_URL;
if (!app) throw Error("Set APP_URL to the Shelf origin");
const url = new URL(app);
const local =
  url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
if (!(local || url.protocol === "https:") || url.origin !== app)
  throw Error("APP_URL must be an exact HTTPS origin or a local HTTP origin");

const files = [];
const output = new URL("../dist-extension/", import.meta.url);
const unpacked = new URL("unpacked/", output);
await mkdir(unpacked, { recursive: true });
for (const name of ["manifest.json", "content.js", "content.css"]) {
  let input = await readFile(
    new URL("../extension/" + name, import.meta.url),
    "utf8",
  );
  if (name === "content.js")
    input = input.replace('"__SHELF_APP_URL__"', JSON.stringify(app));
  await writeFile(new URL(name, unpacked), input);
  files.push({ name, input });
}
const archive = downloadZip(files);
await writeFile(
  new URL("shelf-mv3.zip", output),
  Buffer.from(await archive.arrayBuffer()),
);
process.stdout.write(
  "Built dist-extension/shelf-mv3.zip and dist-extension/unpacked\n",
);
