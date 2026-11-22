import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

test("Settings Privacy describes retention and copies redacted diagnostics", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog");
  await settings.getByText("Privacy", { exact: true }).click();
  await expect(
    settings.getByText("Shelf has no telemetry, analytics or crash reporting."),
  ).toBeVisible();
  const table = settings.getByRole("table", {
    name: "What Shelf stores on this device",
  });
  await expect(table.getByRole("row")).toHaveCount(7);
  await expect(
    settings.getByText("api.github.com", { exact: true }),
  ).toBeVisible();
  await expect(
    settings.getByText("shelf-oauth.example", { exact: true }),
  ).toBeVisible();
  await settings.getByRole("button", { name: "Copy diagnostics" }).click();
  await expect(settings.getByRole("status")).toHaveText(
    "Redacted diagnostics copied.",
  );
  const report = await page.evaluate(() => navigator.clipboard.readText());
  expect(report).toMatch(/^Shelf \d+\.\d+\.\d+\r?\nBrowser: Chrome \d+/);
  expect(report).toContain("Recent error codes:");
  const axe = await new AxeBuilder({ page }).include("table").analyze();
  expect(axe.violations).toEqual([]);
});

test("a GitHub extension URL opens a nested file on a slash branch", async ({
  page,
}) => {
  const branch = "work/draft";
  const source = "Extension-linked note";
  await page.route("https://api.github.com/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === "/user") return route.fulfill({ json: { login: "ada" } });
    if (path === "/user/repos")
      return route.fulfill({
        json: [
          { full_name: "ada/notes", default_branch: branch, private: true },
        ],
      });
    if (path.endsWith("/git/trees/work/draft"))
      return route.fulfill({
        json: {
          tree: [{ path: "chapter", sha: "dir", type: "tree", mode: "040000" }],
        },
      });
    if (path.endsWith("/git/trees/dir"))
      return route.fulfill({
        json: {
          tree: [
            {
              path: "a b.txt",
              sha: "file",
              size: source.length,
              type: "blob",
              mode: "100644",
            },
          ],
        },
      });
    if (path.endsWith("/contents/chapter/a b.txt"))
      return route.fulfill({ body: source });
    if (path.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@work%2Fdraft/chapter/a%20b.txt");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("fixture-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page).toHaveURL(/#\/view\//);
  await expect(page.getByRole("region", { name: "a b.txt" })).toContainText(
    source,
  );
});

test("the extension injects a single encoded link on GitHub repository navigation", async ({
  page,
}) => {
  const source = readFileSync("extension/content.js", "utf8").replace(
    "__SHELF_APP_URL__",
    "https://shelf.example",
  );
  const embeddedData = JSON.stringify({
    payload: {
      repo: { ownerLogin: "ada", name: "notes", defaultBranch: "main" },
      refInfo: { name: "work/draft" },
    },
  });
  await page.route("https://github.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<main></main><script type="application/json" data-target="react-app.embeddedData">' +
        embeddedData +
        "</script>",
    }),
  );
  await page.goto(
    "https://github.com/ada/notes/blob/work/draft/chapter/a%20b.txt",
  );
  await page.addScriptTag({ content: source });
  const link = page.getByRole("link", { name: "Open in Shelf" });
  await expect(link).toHaveAttribute(
    "href",
    "https://shelf.example/#/gh/ada/notes@work%2Fdraft/chapter/a%20b.txt",
  );
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  for (const path of ["/ada/notes", "/settings/profile"]) {
    await page.evaluate((next) => {
      history.pushState(null, "", next);
      document.dispatchEvent(new Event("turbo:load"));
    }, path);
    if (path === "/ada/notes")
      await expect(link).toHaveAttribute(
        "href",
        "https://shelf.example/#/gh/ada/notes@main/",
      );
    else await expect(link).toHaveCount(0);
  }
});
