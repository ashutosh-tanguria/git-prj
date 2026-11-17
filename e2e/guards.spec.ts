import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { uiServer } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
for (const theme of ["light", "dark"])
  test("guard UI " + theme, async ({ page }) => {
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
    await page.goto("/#/gh/ada/sample-reading-library@main/");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await page.screenshot({ path: `docs/m2/explorer-${theme}.png` });
    await page
      .locator("button")
      .filter({ hasText: "ada/sample-reading-library:" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `docs/m2/ledger-${theme}.png` });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.items.add(
        new File([new Uint8Array(150 * 1048576)], "sample-large.pdf"),
      );
      window.dispatchEvent(
        new DragEvent("drop", { dataTransfer: data, bubbles: true }),
      );
    });
    await expect(
      page.getByText("This file is too large for GitHub"),
    ).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((node) => node === document.activeElement),
    ).toBe(true);
    await expect(
      page.getByRole("button", {
        name: "Stage files",
        exact: true,
      }),
    ).toBeDisabled();
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    await page.screenshot({ path: `docs/m2/block-${theme}.png` });
    await page
      .getByRole("button", { name: "Don’t stage", exact: true })
      .click();
  });
