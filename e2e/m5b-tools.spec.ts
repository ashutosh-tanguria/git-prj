import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function connectTools(page: Page) {
  await page.route("https://api.github.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/user") return route.fulfill({ json: { login: "ada" } });
    const repo = {
      full_name: "ada/notes",
      default_branch: "main",
      private: true,
      size: 16,
    };
    if (path === "/user/repos") return route.fulfill({ json: [repo] });
    if (path === "/repos/ada/notes") return route.fulfill({ json: repo });
    if (path.endsWith("/git/ref/heads/main"))
      return route.fulfill({ json: { object: { sha: "fixture-head" } } });
    if (path.endsWith("/git/commits/fixture-head"))
      return route.fulfill({ json: { tree: { sha: "main" } } });
    if (path.endsWith("/git/trees/main"))
      return route.fulfill({
        json: {
          tree: [
            {
              path: "copy-one.txt",
              sha: "first",
              type: "blob",
              mode: "100644",
              size: 4,
            },
            {
              path: "copy-two.txt",
              sha: "second",
              type: "blob",
              mode: "100644",
              size: 4,
            },
            {
              path: "oversized.bin",
              sha: "third",
              type: "blob",
              mode: "100644",
              size: 105 * 1024 * 1024,
            },
          ],
        },
      });
    if (path.includes("/contents/copy-"))
      return route.fulfill({ body: "same", contentType: "text/plain" });
    if (path.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("local-test-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(
    page.getByRole("button", { name: "copy-one.txt" }),
  ).toBeVisible();
}
async function command(page: Page, label: string) {
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Commands and search" })
    .fill("> " + label);
  await page.getByRole("option", { name: new RegExp(label, "i") }).click();
}

test("downloads the selected bytes and rejects oversized ZIP selections before reading them", async ({
  page,
}) => {
  await connectTools(page);
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  const list = page.getByRole("grid");
  await list.getByRole("button", { name: "copy-one.txt" }).click();
  const downloadEvent = page.waitForEvent("download");
  await command(page, "Export selection as ZIP");
  const archive = await readFile(await (await downloadEvent).path());
  expect(archive.subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));
  expect(archive.includes("copy-one.txt")).toBe(true);
  expect(archive.includes("same")).toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await list.getByRole("button", { name: "oversized.bin" }).click();
  let oversizedReads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/contents/oversized.bin")) oversizedReads++;
  });
  await command(page, "Export selection as ZIP");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "100 MiB",
  );
  expect(oversizedReads).toBe(0);
});

test("finds equal contents and queues one guarded delete while keeping a copy", async ({
  page,
}) => {
  await connectTools(page);
  await command(page, "Find duplicates");
  const dialog = page.getByRole("dialog", { name: "Find duplicates" });
  await expect(
    dialog.getByRole("group", { name: "2 matching copies" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Select all but one per group" })
    .click();
  await expect(dialog.getByRole("checkbox", { checked: true })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Review selected deletes" }).click();
  await dialog
    .getByRole("button", { name: "Stage files", exact: true })
    .click();
  await expect(dialog.getByText(/1 delete staged/)).toBeVisible();
});
