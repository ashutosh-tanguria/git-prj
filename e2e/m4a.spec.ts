import { expect, test } from "@playwright/test";

test("mock cloud locations, recoverable deletes, and retry after a partial push", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const { origin } = new URL(request.url());
    if (origin !== "http://127.0.0.1:4173") external.push(origin);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Connect Google Drive" }).click();
  const tree = page.getByRole("tree", { name: "Locations" });
  await expect(
    tree.getByRole("treeitem", { name: "Google Drive" }),
  ).toBeVisible();
  const drive = page.getByRole("region", { name: "Google Drive" });
  await expect(
    drive.getByRole("button", { name: "reading-notes.txt" }),
  ).toBeVisible();
  await expect(page.getByText("Less than 5% free")).toBeVisible();
  await page
    .getByRole("button", { name: "Upload files", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles([
      {
        name: "first.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("first"),
      },
      {
        name: "fail-once.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("second"),
      },
      { name: "last.txt", mimeType: "text/plain", buffer: Buffer.from("last") },
    ]);
  const pending = drive.getByRole("region", { name: "Pending" });
  await expect(pending).toContainText("Pending tray 3");
  await pending.getByRole("button", { name: "Push" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Push" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Try again in 30 seconds",
  );
  await expect(dialog).not.toContainText("first.txt");
  await expect(dialog).toContainText("fail-once.txt");
  await expect(dialog).toContainText("last.txt");
  await dialog.getByRole("button", { name: "Push" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pending).toContainText("Pending tray 0");
  for (const name of ["first.txt", "fail-once.txt", "last.txt"]) {
    await expect(drive.getByRole("button", { name, exact: true })).toHaveCount(
      1,
    );
  }

  await drive.getByRole("button", { name: "first.txt" }).click();
  await page
    .getByRole("button", { name: "Delete", exact: true })
    .first()
    .click();
  await expect(dialog).toContainText("Google Drive Trash");
  await dialog.getByRole("button", { name: "Stage change" }).click();
  await pending.getByRole("button", { name: "Push" }).click();
  await dialog.getByRole("button", { name: "Push" }).click();
  await expect(drive.getByRole("button", { name: "first.txt" })).toHaveCount(0);

  for (const provider of ["Dropbox", "OneDrive"]) {
    await page
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .click();
    await dialog.getByRole("button", { name: "Connect " + provider }).click();
    await expect(
      dialog.getByRole("button", { name: "Disconnect " + provider }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(tree.getByRole("treeitem", { name: provider })).toBeVisible();
    const content = page.getByRole("region", { name: provider });
    await content.getByRole("button", { name: "reading-notes.txt" }).click();
    const download = page.waitForEvent("download");
    await content
      .getByRole("button", { name: "Download", exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe("reading-notes.txt");
  }
  expect(
    external.every((origin) =>
      [
        "https://www.googleapis.com",
        "https://api.dropboxapi.com",
        "https://content.dropboxapi.com",
        "https://example.files.1drv.com",
        "https://graph.microsoft.com",
      ].includes(origin),
    ),
  ).toBe(true);
});
