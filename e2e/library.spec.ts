import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
const server = setupServer(
  http.get(
    "https://api.github.com/repos/ada/notes/contents/distributed-systems.pdf",
    () =>
      new HttpResponse(
        new Uint8Array(readFileSync("fixtures/sample-reading.pdf")),
        { headers: { "Content-Type": "application/pdf" } },
      ),
  ),
  http.get("https://api.github.com/user", () =>
    HttpResponse.json({ login: "ada" }),
  ),
  http.get("https://api.github.com/user/repos", () =>
    HttpResponse.json([
      { full_name: "ada/notes", default_branch: "main", private: true },
    ]),
  ),
  http.get("https://api.github.com/repos/ada/notes/git/trees/main", () =>
    HttpResponse.json({
      tree: [
        {
          path: "distributed-systems.pdf",
          sha: "sample-pdf",
          type: "blob",
          mode: "100644",
          size: 1024,
        },
        {
          path: "operating-systems.md",
          sha: "sample",
          type: "blob",
          mode: "100644",
          size: 1200,
        },
      ],
      truncated: false,
    }),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/operating-systems.md",
    () =>
      new HttpResponse(
        "# Operating systems\n\nSample reading notes for week three.",
      ),
  ),
);
test.beforeAll(() => server.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => server.close());
for (const theme of ["light", "dark"])
  test("Explorer and Viewer " + theme, async ({ page }) => {
    await page.route("https://api.github.com/**", async (route) => {
      const res = await fetch(route.request().url(), {
        headers: route.request().headers(),
      });
      await route.fulfill({
        status: res.status,
        contentType: res.headers.get("content-type") || "application/json",
        body: Buffer.from(await res.arrayBuffer()),
      });
    });
    await page.goto("/#/gh/ada/notes@main/");
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(
      page.getByRole("button", { name: "operating-systems.md" }),
    ).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/explorer-" + theme + ".png",
    });
    await page.getByRole("grid").focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "operating-systems.md" }).click();
    await expect(
      page.getByRole("heading", { name: "Operating systems", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/viewer-" + theme + ".png",
    });
    await page.evaluate(() => {
      location.hash =
        "#/view/" +
        encodeURIComponent("gh:ada/notes@main/distributed-systems.pdf");
    });
    await expect(page.getByLabel("PDF page", { exact: true })).toHaveAttribute(
      "width",
      "734",
    );
    await page.screenshot({
      path: "docs/screenshots/viewer-pdf-" + theme + ".png",
    });
    const url = page.url();
    await page.reload();
    await expect(page.getByLabel("GitHub token")).toBeVisible();
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(page.getByLabel("PDF page", { exact: true })).toBeVisible();
    await expect(page.getByLabel("PDF page", { exact: true })).toHaveAttribute(
      "width",
      "734",
    );
    expect(page.url()).toBe(url);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
  });
