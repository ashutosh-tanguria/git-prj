import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { auditPreviewMessages } from "./previewAudit";

async function connect(page: Page) {
  await page.route("https://api.github.com/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.includes("/contents/")) {
      const name = path.split("/contents/")[1];
      await route.fulfill({
        body:
          name === "corrupt.docx" || name === "corrupt.xlsx"
            ? Buffer.from("not an office archive")
            : readFileSync("fixtures/" + name),
        contentType: "application/octet-stream",
      });
      return;
    }
    const json =
      path === "/user"
        ? { login: "ada" }
        : path === "/user/repos"
          ? [
              {
                full_name: "ada/office",
                default_branch: "main",
                private: true,
                size: 64,
              },
            ]
          : path.includes("/git/trees/")
            ? { tree: [], truncated: false }
            : path.endsWith("/commits")
              ? []
              : { full_name: "ada/office", private: true, size: 64 };
    await route.fulfill({ json });
  });
  await page.goto("/#/gh/ada/office@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("OFFICE_PROVIDER_TOKEN_SENTINEL");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
}
async function open(page: Page, name: string) {
  await page.evaluate((name) => {
    location.hash =
      "#/view/" + encodeURIComponent("gh:ada/office@main/" + name);
  }, name);
}

test("Office fixtures render DOCX text/table/image, XLSX saved formulas and PPTX slides", async ({
  page,
}) => {
  await connect(page);
  await open(page, "office-reading.docx");
  const office = page.frameLocator('iframe[title="Office Quick view"]');
  await expect(office.getByText("Office reading note")).toBeVisible();
  await expect(office.locator("td")).toHaveText("Table cell");
  await expect(office.locator("img")).toHaveJSProperty("naturalWidth", 1);
  await open(page, "office-reading.xlsx");
  await expect(
    office.getByRole("cell", { name: "6", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(office.getByText("Second sheet", { exact: true })).toBeVisible();
  await open(page, "office-reading.pptx");
  await expect(
    office.getByText("Reading slide 1", { exact: true }),
  ).toBeVisible();
  await expect(
    office.getByText("Reading slide 2", { exact: true }),
  ).toBeVisible();
  await expect(office.locator("img").first()).toHaveJSProperty(
    "naturalWidth",
    1,
  );
  await expect(
    page.getByText(/animations, transitions, charts, SmartArt/),
  ).toBeVisible();
  await open(page, "corrupt.docx");
  await expect(
    page.getByText("Shelf cannot open this document. It may be damaged."),
  ).toBeVisible();
});

test("hostile Office content is contained and tokens/app storage never reach the sandbox", async ({
  page,
  context,
}) => {
  const traffic = await auditPreviewMessages(context);
  const sandboxRequests: string[] = [];
  const exfil: string[] = [];
  context.on("request", (request) => {
    if (request.url().includes("4174"))
      sandboxRequests.push(
        request.url() +
          JSON.stringify(request.headers()) +
          (request.postData() || ""),
      );
    if (request.url().includes("office-exfil")) exfil.push(request.url());
  });
  await connect(page);
  await page.evaluate(() => {
    localStorage.setItem("shelf-private", "OFFICE_STORAGE_SENTINEL");
    sessionStorage.setItem("shelf-private", "OFFICE_SESSION_SENTINEL");
  });
  await open(page, "office-hostile.docx");
  const office = page.frameLocator('iframe[title="Office Quick view"]');
  await expect(office.getByText("Hostile parent probe")).toBeVisible();
  await office.getByText("Hostile parent probe").click();
  await expect(
    office.locator("script:not([src]),iframe,a[href^='javascript:']"),
  ).toHaveCount(0);
  const child = page
    .frames()
    .find((frame) => frame.url().includes("/office.html"))!;
  expect(
    await child.evaluate(() => {
      let parentBlocked = false;
      try {
        void parent.document.body;
      } catch {
        parentBlocked = true;
      }
      return {
        parentBlocked,
        local: localStorage.getItem("shelf-private"),
        session: sessionStorage.getItem("shelf-private"),
      };
    }),
  ).toEqual({ parentBlocked: true, local: null, session: null });
  expect(
    await page.locator("body").getAttribute("data-office-escaped"),
  ).toBeNull();
  expect(exfil).toEqual([]);
  await expect
    .poll(() => traffic.some((value) => value.includes('"type":"rendered"')))
    .toBe(true);
  for (const secret of [
    "OFFICE_PROVIDER_TOKEN_SENTINEL",
    "OFFICE_STORAGE_SENTINEL",
    "OFFICE_SESSION_SENTINEL",
  ])
    expect(traffic.join("\n") + sandboxRequests.join("\n")).not.toContain(
      secret,
    );
});
