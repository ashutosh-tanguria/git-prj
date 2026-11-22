import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function connect(page: Page, count = 2) {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("First page", { x: 30, y: 600 });
  const bytes = Buffer.from(await pdf.save());
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
          tree: [
            { path: "Week 1", sha: "tree-1", type: "tree", mode: "040000" },
            {
              path: "cover.pdf",
              sha: "cover",
              type: "blob",
              mode: "100644",
              size: bytes.length,
            },
            ...Array.from({ length: count }, (_, index) => ({
              path: "item-" + String(index).padStart(5, "0") + ".txt",
              sha: String(index),
              type: "blob",
              mode: "100644",
              size: 12,
            })),
          ],
        },
      });
    if (path.endsWith("/git/trees/tree-1"))
      return route.fulfill({
        json: {
          tree: [
            {
              path: "lesson.txt",
              sha: "lesson",
              type: "blob",
              mode: "100644",
              size: 12,
            },
          ],
        },
      });
    if (path.endsWith("/cover.pdf"))
      return route.fulfill({ body: bytes, contentType: "application/pdf" });
    if (path.endsWith("/lesson.txt"))
      return route.fulfill({ body: "Lesson one", contentType: "text/plain" });
    if (path.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("local-test-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("button", { name: "cover.pdf" })).toBeVisible();
}

test("Grid renders a PDF thumbnail and virtualizes ten thousand items", async ({
  page,
}) => {
  await connect(page, 9_998);
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  const grid = page.getByRole("listbox", { name: "Files" });
  const pdf = grid.getByRole("option", { name: /cover.pdf/ });
  await expect(pdf.locator("img")).toBeVisible({ timeout: 12_000 });
  await expect(pdf).toHaveAttribute("aria-setsize", "10000");
  expect(await grid.getByRole("option").count()).toBeLessThan(150);
  await page.getByLabel("Thumbnail size").selectOption("200");
  await expect(pdf.locator("img")).toBeVisible({ timeout: 12_000 });
  await grid.press("End");
  await expect(grid.getByRole("option", { name: /item-09997/ })).toBeVisible();
  await grid.press("Control+Space");
  await expect(
    grid.getByRole("option", { name: /item-09997/ }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Columns opens a folder, resizes and previews a file by keyboard", async ({
  page,
}) => {
  await connect(page);
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Commands and search" })
    .fill("> columns");
  await page.getByRole("option", { name: "Columns", exact: true }).click();
  const root = page.getByRole("tree", { name: "Files 1" });
  await root.press("ArrowRight");
  const child = page.getByRole("tree", { name: "Week 1 2" });
  await expect(child).toBeFocused();
  await expect(
    child.getByRole("treeitem", { name: "TXT lesson.txt" }),
  ).toBeVisible();
  await child.press("ArrowRight");
  await expect(
    page
      .getByRole("region", { name: "Preview", exact: true })
      .getByText("Lesson one"),
  ).toBeVisible();
  await child.press("ArrowLeft");
  await expect(root).toBeFocused();
  const sash = page.getByRole("separator", { name: "Column width Week 1" });
  await sash.press("ArrowRight");
  await expect(sash).toHaveAttribute("aria-valuenow", "256");
});
