import { expect, test, type Page } from "@playwright/test";

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
