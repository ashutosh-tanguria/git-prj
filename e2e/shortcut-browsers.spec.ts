import { chromium, expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { uiServer } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
test("installed Chrome and Edge deliver the default shortcuts to the app", async () => {
  test.setTimeout(60000);
  const results: { browser: string; version: string; result: string }[] = [];
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      const page = await browser.newPage();
      await page.route("https://api.github.com/**", async (route) => {
        const response = await fetch(route.request().url(), {
          headers: route.request().headers(),
        });
        await route.fulfill({
          status: response.status,
          contentType:
            response.headers.get("content-type") || "application/json",
          body: Buffer.from(await response.arrayBuffer()),
        });
      });
      await page.goto(
        "http://127.0.0.1:4173/#/gh/ada/sample-reading-library@main/",
      );
      await page.getByRole("button", { name: "Connect", exact: true }).click();
      await page.getByLabel("GitHub token").fill("sample-token");
      await page.getByRole("button", { name: "Validate token" }).click();
      await expect(page.getByRole("grid")).toBeVisible();
      await page
        .getByRole("button", { name: "Settings", exact: true })
        .waitFor();
      // Wait for the lazily mounted command registry rather than racing module evaluation.
      await expect(
        page.locator('input[type="file"][aria-label="Upload files"]'),
      ).toBeAttached();
      await page.keyboard.press("Alt+n");
      await expect(
        page.getByRole("heading", { name: "Create repository", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.keyboard.press("Alt+m");
      await expect(
        page.getByRole("heading", { name: "New folder", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.keyboard.press("Alt+p");
      await expect(
        page.getByRole("heading", { name: "Pending review", exact: true }),
      ).toBeVisible();
      results.push({
        browser: channel,
        version: browser.version(),
        result:
          "Headless automated key dispatch passed for Alt+N, Alt+M, Alt+P. Native browser-menu conflicts remain a manual check.",
      });
    } finally {
      await browser.close();
    }
  }
  writeFileSync(
    "docs/m3b-browser-checks.json",
    JSON.stringify(
      {
        date: "2026-11-17",
        results,
        firefox:
          "Unverified: no Firefox executable found in standard Program Files or per-user installation paths. No native UI conflict check claimed.",
      },
      null,
      2,
    ) + "\n",
  );
});
