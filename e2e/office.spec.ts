import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { auditPreviewMessages } from "./previewAudit";
import AxeBuilder from "@axe-core/playwright";
import { utils, write } from "xlsx";

async function connect(page: Page) {
  await page.route("https://api.github.com/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.includes("/contents/")) {
      const name = path.split("/contents/")[1];
      let body: Buffer;
      if (name === "long.xlsx") {
        const workbook = utils.book_new();
        utils.book_append_sheet(
          workbook,
          utils.aoa_to_sheet(
            Array.from({ length: 5001 }, (_, index) => [index]),
          ),
          "Long",
        );
        body = write(workbook, { type: "buffer", bookType: "xlsx" });
      } else
        body = name.startsWith("corrupt.")
          ? Buffer.from("not an office archive")
          : readFileSync("fixtures/" + name);
      await route.fulfill({
        body,
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
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await connect(page);
  await open(page, "office-reading.docx");
  const office = page.frameLocator('iframe[title="Office Quick view"]');
  await expect(office.getByText("Office reading note")).toBeVisible();
  await expect(office.locator("td")).toHaveText("Table cell");
  await expect(office.locator("img")).toHaveJSProperty("naturalWidth", 1);
  await page
    .getByRole("button", { name: "Copy path", exact: true })
    .first()
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "gh:ada/office@main/office-reading.docx",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("office-reading.docx");
  await open(page, "office-reading.xlsx");
  await expect(
    office.getByRole("cell", { name: "6", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Summary", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(office.getByText("Second sheet", { exact: true })).toBeVisible();
  await open(page, "long.xlsx");
  await expect(
    page.getByText(/^Quick view shows the first 5,000 rows/),
  ).toBeVisible();
  await office.locator(".sheet-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    office.getByRole("cell", { name: "4999", exact: true }),
  ).toBeVisible();
  await expect(
    office.getByRole("cell", { name: "5000", exact: true }),
  ).toHaveCount(0);
  await open(page, "office-reading.pptx");
  await expect(
    office.getByText("Reading slide 1", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Slide", { exact: true }).fill("2");
  await page.getByLabel("Office zoom").selectOption("150");
  await expect(office.locator("#document")).toHaveCSS("zoom", "1.5");
  const child = page
    .frames()
    .find((frame) => frame.url().includes("/office.html"))!;
  await child.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("-");
  await expect(page.getByLabel("Office zoom")).toHaveValue("125");
  expect(
    (
      await new AxeBuilder({ page }).include("[data-office-viewer]").analyze()
    ).violations.filter((value) =>
      ["serious", "critical"].includes(value.impact || ""),
    ),
  ).toEqual([]);
  const cloud = page.getByRole("button", {
    name: "Render in cloud",
    exact: true,
  });
  await cloud.focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Available in a later release",
  );
  await page.keyboard.press("Escape");
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
  await open(page, "corrupt.pptx");
  await expect(
    page.getByText("Shelf cannot open this document. It may be damaged."),
  ).toBeVisible();
  await open(page, "corrupt.xlsx");
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
  await page.evaluate(async () => {
    localStorage.setItem("shelf-private", "OFFICE_STORAGE_SENTINEL");
    sessionStorage.setItem("shelf-private", "OFFICE_SESSION_SENTINEL");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("office-private-storage", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("private");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("private", "readwrite");
        transaction
          .objectStore("private")
          .put("OFFICE_IDB_SENTINEL", "private");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
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
    await child.evaluate(async () => {
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
        privateDatabase: (await indexedDB.databases()).some(
          (database) => database.name === "office-private-storage",
        ),
      };
    }),
  ).toEqual({
    parentBlocked: true,
    local: null,
    session: null,
    privateDatabase: false,
  });
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
    "OFFICE_IDB_SENTINEL",
  ])
    expect(traffic.join("\n") + sandboxRequests.join("\n")).not.toContain(
      secret,
    );
});
