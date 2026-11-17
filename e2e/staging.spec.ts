import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { uiServer } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
test("persists dropped files across reload and exports a working ZIP", async ({
  page,
}) => {
  let collision = false;
  let commits = 0;
  let treeEntries: { path: string; sha: string | null }[] = [];
  await page.route("https://api.github.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/repos/ada/sample-reading-library")
      return json({ size: 612 * 1024, private: true });
    if (path.includes("/git/ref/")) return json({ object: { sha: "head" } });
    if (path.includes("/git/commits/")) return json({ tree: { sha: "tree" } });
    if (path.includes("/git/trees/"))
      return json({
        tree: [
          { path: "distributed-systems.pdf", sha: "pdf", mode: "100644" },
          ...(collision
            ? [{ path: "sample-a.txt", sha: "upstream", mode: "100644" }]
            : []),
        ],
      });
    if (route.request().method() !== "GET") {
      if (path.endsWith("/git/commits")) commits++;
      if (path.endsWith("/git/trees"))
        treeEntries = route.request().postDataJSON().tree;
      return json({ sha: "next" });
    }
    const r = await fetch(route.request().url(), {
      headers: route.request().headers(),
    });
    await route.fulfill({
      status: r.status,
      contentType: r.headers.get("content-type") || "application/json",
      body: Buffer.from(await r.arrayBuffer()),
    });
  });
  const connect = async () => {
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(page.getByRole("grid")).toBeVisible();
  };
  await page.goto("/#/gh/ada/sample-reading-library@main/");
  await connect();
  await expect(
    page.locator('input[type="file"][aria-label="Upload files"]'),
  ).toBeAttached();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() => {
    const data = new DataTransfer();
    for (const name of ["sample-a.txt", "sample-b.txt", "sample-c.txt"])
      data.items.add(new File(["Sample working copy"], name));
    window.dispatchEvent(
      new DragEvent("drop", { dataTransfer: data, bubbles: true }),
    );
  });
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "distributed-systems.pdf", exact: true })
    .click();
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  await page.getByRole("button", { name: "Stage delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(
    page.getByText("add: sample-a.txt", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await connect();
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(
    page.getByText("add: sample-c.txt", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download working copy", exact: true })
    .click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe("shelf-working-copy.zip");
  const backupPath = (await downloaded.path())!;
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Discard", exact: true })
      .first()
      .click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator('input[accept=".zip"]').setInputFiles(backupPath);
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(
    page.getByText("add: sample-a.txt", { exact: false }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.screenshot({ path: "docs/m3a/pending-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({ path: "docs/m3a/pending-dark.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Push", exact: true })
    .click();
  await expect(page.getByText("Push completed", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(commits).toBe(1);
  expect(treeEntries).toHaveLength(4);
  expect(
    treeEntries.some(
      (e) => e.path === "distributed-systems.pdf" && e.sha === null,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator('input[accept=".zip"]').setInputFiles(backupPath);
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(
    page.getByText("add: sample-a.txt", { exact: false }),
  ).toBeVisible();
  collision = true;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Push", exact: true })
    .click();
  await expect(
    page.getByText("Changed on GitHub since you staged this", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.screenshot({ path: "docs/m3a/conflict-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({ path: "docs/m3a/conflict-dark.png" });
});
