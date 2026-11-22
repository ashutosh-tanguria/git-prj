import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function connectPair(page: Page) {
  await page.getByRole("button", { name: "Connect Google Drive" }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const settings = page.getByRole("dialog");
  await settings.getByRole("button", { name: "Connect Dropbox" }).click();
  await expect(
    settings.getByRole("button", { name: "Disconnect Dropbox" }),
  ).toBeVisible();
  await settings.getByRole("button", { name: "Cancel" }).click();
}

test("opens native directory handles for import and streamed export when available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: async ({ mode }: { mode: "read" | "readwrite" }) => {
        if (mode === "read")
          return {
            kind: "directory",
            name: "Native",
            async *values() {
              yield {
                kind: "file",
                name: "input.txt",
                getFile: async () =>
                  new File(["native input"], "input.txt", {
                    type: "text/plain",
                  }),
              };
            },
          };
        return {
          async getFileHandle(name: string, options?: { create?: boolean }) {
            if (!options?.create)
              throw new DOMException("Missing file", "NotFoundError");
            return {
              createWritable: async () => {
                const chunks: string[] = [];
                return new WritableStream<Uint8Array>({
                  write(bytes) {
                    chunks.push(new TextDecoder().decode(bytes));
                  },
                  close() {
                    document.documentElement.dataset.nativeExport =
                      name + ":" + chunks.join("");
                  },
                });
              },
            };
          },
        };
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Connect Google Drive" }).click();
  const drive = page.getByRole("region", { name: "Google Drive" });
  await drive.getByRole("button", { name: "reading-notes.txt" }).click();
  await page
    .getByRole("button", { name: "Export selected files" })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-native-export",
    "reading-notes.txt:Sample reading notes.",
  );
  await page
    .getByRole("button", { name: "Import local folder" })
    .first()
    .click();
  const picker = page.getByRole("dialog", { name: "Copy to" });
  await picker
    .getByRole("combobox", { name: "Destination" })
    .selectOption({ label: "Google Drive" });
  await picker.getByRole("button", { name: "Review staged operation" }).click();
  await expect(picker).toContainText("Native/input.txt");
});

test("a cross-provider Cut is one recoverable pending move after reload", async ({
  page,
}) => {
  await page.goto("/");
  await connectPair(page);
  const tree = page.getByRole("tree", { name: "Locations" });
  const drive = page.getByRole("region", { name: "Google Drive" });
  const dropbox = page.getByRole("region", { name: "Dropbox" });
  await tree.getByRole("treeitem", { name: "Google Drive" }).click();
  const file = drive.getByRole("button", { name: "reading-notes.txt" });
  await file.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy to" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await file.click();
  await page.getByRole("button", { name: "Cut", exact: true }).first().click();
  await tree.getByRole("treeitem", { name: "Dropbox" }).click();
  await page
    .getByRole("button", { name: "Paste", exact: true })
    .first()
    .click();
  const picker = page.getByRole("dialog", { name: "Move to" });
  await picker.getByRole("button", { name: "Review staged operation" }).click();
  await picker.getByRole("button", { name: "Keep both" }).click();
  await expect(picker).toContainText("reading-notes (shelf copy).txt");
  await picker
    .getByRole("button", { name: "Stage files", exact: true })
    .click();
  const queue = page.getByRole("region", { name: "Pending transfers" });
  await expect(queue).toContainText("Review transfers (1)");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await connectPair(page);
  await queue.getByRole("button", { name: "Review transfers (1)" }).click();
  const review = page.getByRole("dialog", { name: "Review transfers" });
  await expect(review.getByRole("listitem")).toHaveCount(1);
  await expect(review).toContainText("recoverable from Google Drive Trash");
  await review.getByRole("button", { name: "Push", exact: true }).click();
  await review.getByRole("button", { name: "Start transfer" }).click();
  await expect(review.getByText("Done", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Close" }).click();
  await expect(
    dropbox.getByRole("button", {
      name: "reading-notes (shelf copy).txt",
      exact: true,
    }),
  ).toHaveCount(1);
  await tree.getByRole("treeitem", { name: "Google Drive" }).click();
  await expect(drive.getByRole("button", { name: "Coursework" })).toBeVisible();
  await expect(file).toHaveCount(0);
});

test("Split panes keep independent history and view and stage drag transfers", async ({
  page,
}) => {
  await page.goto("/");
  await connectPair(page);
  await page.keyboard.press("Control+Backslash");
  const left = page.getByRole("region", { name: "Left explorer" });
  const right = page.getByRole("region", { name: "Right explorer" });
  await left.getByRole("button", { name: "Coursework" }).click();
  await expect(left).toContainText("Dropbox/Coursework");
  await expect(
    right.getByRole("checkbox", { name: "reading-notes.txt" }),
  ).toBeVisible();
  await left.getByRole("combobox", { name: "View" }).selectOption("grid");
  await expect(right.getByRole("combobox", { name: "View" })).toHaveValue(
    "list",
  );
  await left.getByRole("button", { name: "Back" }).click();
  await expect(
    left.getByRole("checkbox", { name: "reading-notes.txt" }),
  ).toBeVisible();
  await left.getByRole("button", { name: "Forward" }).click();
  await expect(left).toContainText("Dropbox/Coursework");
  const row = right
    .getByRole("listitem")
    .filter({ hasText: "reading-notes.txt" });
  await row.dragTo(left);
  const copy = page.getByRole("dialog", { name: "Copy to" });
  await expect(copy).toBeVisible();
  await copy.getByRole("button", { name: "Cancel" }).click();
  await page.keyboard.down("Shift");
  await row.dragTo(left);
  await page.keyboard.up("Shift");
  const move = page.getByRole("dialog", { name: "Move to" });
  await move.getByRole("button", { name: "Review staged operation" }).click();
  await move.getByRole("button", { name: "Stage files" }).click();
  await expect(
    page.getByRole("region", { name: "Pending transfers" }),
  ).toContainText("Review transfers (1)");
});

test("imports nested files through folder upload and exports a ZIP when the API is missing", async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath("field-notes");
  await mkdir(join(folder, "week1"), { recursive: true });
  await writeFile(join(folder, "week1", "entry.txt"), "local folder bytes");
  await page.addInitScript(() =>
    Object.defineProperty(window, "showDirectoryPicker", { value: undefined }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect Google Drive" }).click();
  const drive = page.getByRole("region", { name: "Google Drive" });
  await expect(
    drive.getByRole("button", { name: "reading-notes.txt" }),
  ).toBeVisible();
  const choice = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import local folder" })
    .first()
    .click();
  await (await choice).setFiles(folder);
  const picker = page.getByRole("dialog", { name: "Copy to" });
  await picker
    .getByRole("combobox", { name: "Destination" })
    .selectOption({ label: "Google Drive" });
  await picker.getByRole("button", { name: "Review staged operation" }).click();
  await expect(picker).toContainText("field-notes/week1/entry.txt");
  await picker.getByRole("button", { name: "Stage files" }).click();
  await page.getByRole("button", { name: "Review transfers (1)" }).click();
  const review = page.getByRole("dialog", { name: "Review transfers" });
  await review.getByRole("button", { name: "Push", exact: true }).click();
  await review.getByRole("button", { name: "Start transfer" }).click();
  await expect(review.getByText("Done", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Close" }).click();
  await drive.getByRole("button", { name: "field-notes" }).click();
  await drive.getByRole("button", { name: "week1" }).click();
  await drive.getByRole("button", { name: "entry.txt" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected files" })
    .first()
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("shelf-files.zip");
  const contents = await readFile((await download.path())!);
  expect(contents.includes("entry.txt")).toBe(true);
  expect(contents.includes("local folder bytes")).toBe(true);
});
