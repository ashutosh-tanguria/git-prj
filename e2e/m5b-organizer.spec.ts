import { expect, test, type Page } from "@playwright/test";

async function connect(page: Page) {
  await page.route("https://api.github.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/user") return route.fulfill({ json: { login: "ada" } });
    if (path === "/user/repos")
      return route.fulfill({
        json: [
          { full_name: "ada/notes", default_branch: "main", private: true },
        ],
      });
    if (path.endsWith("/git/trees/main"))
      return route.fulfill({
        json: {
          tree: ["one.txt", "two.txt"].map((path) => ({
            path,
            mode: "100644",
            type: "blob",
            sha: path,
            size: 4,
          })),
        },
      });
    if (path.endsWith("/one.txt") || path.endsWith("/two.txt"))
      return route.fulfill({ body: "text", contentType: "text/plain" });
    if (path.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("local-test-token");
  await page.getByRole("button", { name: "Validate token" }).click();
}

test("organizes opened, starred and tagged references in virtual Explorer locations", async ({
  page,
}) => {
  await connect(page);
  const file = page.getByRole("button", { name: "one.txt", exact: true });
  await file.dblclick();
  await expect(page.getByText("text", { exact: true }).first()).toBeVisible();
  await page.getByRole("treeitem", { name: "Recent", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Provider" }),
  ).toBeVisible();
  await file.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Add to Favorites" }).click();
  await page.getByRole("treeitem", { name: "Favorites", exact: true }).click();
  await file.click({ button: "right" });
  await page.getByRole("menuitem", { name: "New collection" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Course notes");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const collection = page.getByRole("treeitem", { name: "Course notes" });
  await collection.click();
  await file.click({ button: "right" });
  await page.getByRole("menuitem", { name: "New tag" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Review");
  await page.getByRole("dialog").getByRole("combobox").selectOption("pink");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Commands and search" })
    .fill("# rev");
  await page.getByRole("option", { name: "Review" }).click();
  await expect(
    page.getByRole("heading", { name: "Review", exact: true }),
  ).toBeVisible();
  await expect(file).toBeVisible();
  await page.getByRole("treeitem", { name: "ada/notes", exact: true }).click();
  const second = page.getByRole("button", { name: "two.txt", exact: true });
  await second.dragTo(collection);
  await collection.click();
  await expect(second).toBeVisible();
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Commands and search" })
    .fill("> export collection");
  const download = page.waitForEvent("download");
  await page.getByRole("option", { name: "Export collection as ZIP" }).click();
  await expect((await download).suggestedFilename()).toBe("Course notes.zip");
});
