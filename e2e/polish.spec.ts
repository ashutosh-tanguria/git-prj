import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { uiServer, setMode } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
test("polished shell interactions, tooltips and four review captures", async ({
  page,
}) => {
  test.setTimeout(90000);
  setMode("normal");
  await page.route("https://api.github.com/**", async (route) => {
    const r = await fetch(route.request().url(), {
      headers: route.request().headers(),
    });
    await route.fulfill({
      status: r.status,
      contentType: r.headers.get("content-type") || "application/json",
      body: Buffer.from(await r.arrayBuffer()),
    });
  });
  await page.goto("/#/gh/ada/sample-reading-library@main/empty");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.getByLabel("GitHub token")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const axe = async () =>
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  await axe();
  await page.screenshot({ path: "docs/polish/connect-light.png" });
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("sample-ui-review-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "1");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const left = page.getByRole("separator", {
    name: "Locations width",
    exact: true,
  });
  await left.focus();
  await page.keyboard.press("Home");
  await expect(left).toHaveAttribute("aria-valuenow", "160");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(left).toHaveAttribute("aria-valuenow", "224");
  await page.keyboard.press("End");
  await expect(left).toHaveAttribute("aria-valuenow", "360");
  await left.dblclick();
  await expect(left).toHaveAttribute("aria-valuenow", "220");
  await left.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open("shelf-preferences", 1);
            open.onsuccess = () => {
              const db = open.result;
              const req = db
                .transaction("preferences")
                .objectStore("preferences")
                .get("panes");
              req.onsuccess = () => {
                resolve(req.result?.locationsWidth);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(236);
  await page.reload();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("sample-ui-review-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(left).toHaveAttribute("aria-valuenow", "236");
  await left.dblclick();
  const box = (await left.boundingBox())!;
  await page.mouse.move(box.x + 3, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x - 150, box.y + 80);
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Locations", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Locations", exact: true }).click();
  await page.keyboard.press("Control+l");
  const address = page.getByRole("textbox", { name: "Address", exact: true });
  await expect(address).toBeFocused();
  await address.fill("invalid");
  await page.keyboard.press("Escape");
  await expect(address).toHaveCount(0);
  await page.getByRole("button", { name: "Address", exact: true }).click();
  await expect(address).toHaveValue("gh:ada/sample-reading-library@main/empty");
  await page.keyboard.press("Enter");
  await page.mouse.move(0, 0);
  await page.getByRole("grid").focus();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await axe();
  await page.screenshot({ path: "docs/polish/explorer-empty-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await axe();
  await page.screenshot({ path: "docs/polish/explorer-empty-dark.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
  const later = page.getByRole("button", {
    name: "View: Available after M5",
    exact: true,
  });
  await later.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Available after M5");
  await page.screenshot({ path: "docs/polish/command-disabled-hover.png" });
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await later.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.getByRole("button", { name: "Locations", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Locations", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await axe();
});
for (const theme of ["light", "dark"])
  test("Styleguide polish accessibility " + theme, async ({ page }) => {
    await page.goto("/?theme=" + theme + "#/styleguide");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  });
