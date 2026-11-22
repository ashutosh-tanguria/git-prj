import { expect, it } from "vitest";
import { exportWorkingArchive } from "../src/services/workingBackup";
import { parseTransferBackup } from "../src/services/transferBackup";

const draft = {
  source: { local: true, entry: { name: "input.txt", size: 3 } },
  target: { provider: "gdrive", locationId: "gdrive:mock", ref: "gd:root" },
  name: "input.txt",
  move: false,
  folders: ["Imports"],
};
it("restores staged local bytes without accepting verification receipts from ZIPs", async () => {
  const file = { name: "local", data: new Blob(["abc"]) };
  const archive = await exportWorkingArchive(
    {
      version: 1,
      transfers: [
        {
          draft: { ...draft, state: "verified", deleteAttempted: true },
          bytesKey: file.name,
          contentType: "text/plain",
        },
      ],
    },
    [file],
  );
  const [restored] = await parseTransferBackup(archive);
  expect(restored.draft).toMatchObject(draft);
  expect(restored.draft).not.toHaveProperty("state");
  expect(restored.draft).not.toHaveProperty("deleteAttempted");
  expect(await restored.bytes?.text()).toBe("abc");
  expect(restored.bytes?.type).toBe("text/plain");
});

it("refuses a backup that omits a staged local file", async () => {
  const archive = await exportWorkingArchive(
    { version: 1, transfers: [{ draft, bytesKey: "missing" }] },
    [],
  );
  await expect(parseTransferBackup(archive)).rejects.toThrow("workingInvalid");
});
