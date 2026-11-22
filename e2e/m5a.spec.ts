import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

export async function pdfFixture(pages: number, exactSize?: number) {
  const document = await PDFDocument.create();
  for (let number = 1; number <= pages; number++) {
    const page = document.addPage();
    page.drawText(
      number === 12 ? "tidal archive signal" : "Library reading page " + number,
      { x: 35, y: 690 },
    );
  }
  const pdf = Buffer.from(await document.save());
  if (!exactSize || exactSize <= pdf.length) return pdf;
  // Put inert comment bytes before the final trailer pointer so xref offsets stay valid.
  const trailer = pdf.lastIndexOf(Buffer.from("startxref"));
  const padding = Buffer.alloc(exactSize - pdf.length, 32);
  for (let index = 0; index < padding.length - 1; index += 70) {
    padding[index] = 37;
    if (index + 69 < padding.length) padding[index + 69] = 10;
  }
  padding[padding.length - 1] = 10;
  return Buffer.concat([
    pdf.subarray(0, trailer),
    padding,
    pdf.subarray(trailer),
  ]);
}

export async function connectFixture(page: Page, pdf: Buffer) {
  await page.route("https://api.github.com/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/user") return route.fulfill({ json: { login: "ada" } });
    if (pathname === "/user/repos")
      return route.fulfill({
        json: [
          { full_name: "ada/notes", default_branch: "main", private: true },
        ],
      });
    if (pathname.endsWith("/git/trees/main"))
      return route.fulfill({
        json: {
          tree: [
            {
              path: "archive.pdf",
              sha: "edition-1",
              type: "blob",
              mode: "100644",
              size: pdf.length,
            },
          ],
        },
        headers: { etag: '"edition-1"' },
      });
    if (pathname.endsWith("/contents/archive.pdf"))
      return route.fulfill({ body: pdf, contentType: "application/pdf" });
    if (pathname.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("local-test-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await page.getByRole("button", { name: "archive.pdf" }).dblclick();
  await expect(
    page.locator('[data-pdf-page="1"][data-rendered="true"]'),
  ).toBeVisible();
}

test("acceptance 12 finds a cached phrase and highlights page 12", async ({
  page,
}) => {
  await connectFixture(page, await pdfFixture(13));
  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Commands and search" });
  await field.fill("? tidal archive signal");
  const result = page.getByRole("option", {
    name: /archive.pdf.*Page 12.*tidal archive signal/,
  });
  await expect(result.locator("mark")).toHaveText("tidal archive signal");
  await field.press("ArrowDown");
  await field.press("Enter");
  await expect(page.locator('[data-pdf-page="12"] mark')).toHaveText(
    "tidal archive signal",
  );
});

test("filters the current folder and navigates palette modes with the keyboard", async ({
  page,
}) => {
  await connectFixture(page, await pdfFixture(2));
  await page.goBack();
  const file = page
    .getByRole("grid")
    .getByRole("button", { name: "archive.pdf" });
  await file.focus();
  await page.keyboard.press("Control+f");
  const search = page.getByRole("searchbox", { name: "Search this folder" });
  await expect(search).toBeFocused();
  await search.fill("missing name");
  await expect(file).toHaveCount(0);
  await search.press("Escape");
  await expect(file).toBeVisible();

  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Commands and search" });
  await expect(field).toBeFocused();
  await field.fill("#");
  await expect(page.getByText("No tags yet", { exact: true })).toBeVisible();
  await field.fill("> export");
  await expect(
    page.getByRole("option", { name: /Export selection as ZIP/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await field.press("Enter");
  await expect(field).toBeVisible();
  await field.fill("@ ada");
  await expect(page.getByRole("option", { name: /ada\/notes/ })).toBeVisible();
  await field.fill("/ archive");
  await expect(page.getByRole("option", { name: /archive.pdf/ })).toBeVisible();
  await field.press("ArrowDown");
  await field.press("Enter");
  await expect(
    page.getByRole("heading", { name: "archive.pdf" }),
  ).toBeVisible();
});
