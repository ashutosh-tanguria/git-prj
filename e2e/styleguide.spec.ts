import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const theme of ["light", "dark"])
  for (const density of ["compact", "default", "comfortable"])
    test(
      theme + " " + density + " accessibility and snapshot",
      async ({ page }) => {
        await page.clock.setFixedTime(new Date("2026-11-16T12:00:00Z"));
        const external: string[] = [];
        page.on("request", (r) => {
          if (new URL(r.url()).origin !== "http://127.0.0.1:4173")
            external.push(r.url());
        });
        await page.goto(
          "/?theme=" + theme + "&density=" + density + "#/styleguide",
        );
        await expect(
          page.getByRole("heading", { name: "Styleguide", exact: true }),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(
          (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
            ["serious", "critical"].includes(v.impact || ""),
          ),
        ).toEqual([]);
        await expect(page).toHaveScreenshot(theme + "-" + density + ".png", {
          fullPage: true,
        });
        expect(external).toEqual([]);
      },
    );
test("keyboard interaction, tooltip and disabled controls", async ({
  page,
}) => {
  await page.goto("/#/styleguide");
  const demo = page.locator("#interactive");
  const check = demo.getByRole("checkbox").first();
  await check.focus();
  await page.keyboard.press("Space");
  await expect(check).toBeChecked();
  const input = demo.getByLabel("Filename");
  await input.fill("distributed-systems.pdf");
  await expect(input).toHaveValue("distributed-systems.pdf");
  const help = page.getByRole("button", { name: "Preview help", exact: true });
  await help.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(
    demo.getByRole("button", { name: "Review", exact: true }),
  ).toBeDisabled();
  const selected = page.locator(
    '[data-preview="selected"] input[type="checkbox"]',
  );
  await expect(selected).toBeChecked();
});
test("Hindi, 360px, forced colors and 200 percent reflow", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-16T12:00:00Z"));
  await page.goto("/#/styleguide");
  await page.getByLabel("Language").selectOption("hi");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("hindi-360.png", { fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ forcedColors: "active" });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.emulateMedia({ forcedColors: "none" });
  await page.setViewportSize({ width: 720, height: 500 });
  await page.evaluate(() => (document.documentElement.style.zoom = "2"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/styleguide-zoom-200.png",
    fullPage: true,
  });
});

for (const theme of ["light", "dark"])
  test("review captures and tooltip open state " + theme, async ({ page }) => {
    await page.goto("/?theme=" + theme + "#/styleguide");
    await expect(
      page.getByRole("heading", { name: "Styleguide", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "docs/screenshots/styleguide-" + theme + ".png",
    });
    await page.evaluate(() => {
      document.documentElement.style.filter = "grayscale(1)";
    });
    await page.screenshot({
      path: "docs/screenshots/styleguide-" + theme + "-grayscale.png",
    });
    await page.evaluate(() => {
      document.documentElement.style.filter = "blur(2px)";
    });
    await page.screenshot({
      path: "docs/screenshots/styleguide-" + theme + "-squint.png",
    });
    await page.evaluate(() => {
      document.documentElement.style.filter = "";
    });
    await page.mouse.move(0, 0);
    await page.locator("#interactive").getByLabel("Filename").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Preview help", exact: true }),
    ).toBeFocused();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page).toHaveScreenshot("tooltip-" + theme + ".png");
  });
