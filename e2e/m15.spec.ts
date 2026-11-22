import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { uiServer, setMode } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
for (const [width, theme] of [
  [1440, "light"],
  [1440, "dark"],
  [360, "light"],
] as const) {
  test("M1.5 Explorer " + width + " " + theme, async ({ page }) => {
    setMode("normal");
    await page.setViewportSize({ width, height: 1000 });
    await page.route("https://api.github.com/**", async (route) => {
      const response = await fetch(route.request().url(), {
        headers: route.request().headers(),
      });
      await route.fulfill({
        status: response.status,
        contentType: response.headers.get("content-type") || "application/json",
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
    await page.goto("/#/gh/ada/sample-reading-library@main/");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByLabel("GitHub token").fill("sample-ui-review-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      return document.fonts.ready;
    }, theme);
    if (width === 1440) {
      await expect(
        page.getByRole("columnheader").getByRole("button"),
      ).toHaveText(["Name", "Date modified", "Type", "Size", "Last change"]);
      const action = page.getByRole("button", { name: "View", exact: true });
      await action.press("Enter");
      await expect(
        page.getByRole("button", { name: "Columns", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Columns", exact: true })
        .press("Escape");
      await expect(action).toBeFocused();
      await page.getByRole("grid").focus();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    await page.screenshot({ path: `docs/m15/explorer-${width}-${theme}.png` });
    if (width === 1440 && theme === "light") {
      const row = page.getByRole("row").filter({
        has: page.getByRole("button", {
          name: "distributed-systems.pdf",
          exact: true,
        }),
      });
      await row.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#\/view\//);
      await expect(page.locator("main canvas").first()).toBeVisible();
      await page.screenshot({ path: "docs/m15/pdf-light.png" });
    }
  });
}
