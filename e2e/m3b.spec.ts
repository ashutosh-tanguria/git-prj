import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { uiServer } from "./ui-fixtures";
test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
test.afterAll(() => uiServer.close());
async function fixture(page: Page) {
  const state = {
    denied: false,
    private: true,
    size: 1024,
    conflict: false,
    commits: 0,
    blobs: 0,
    message: "",
    tree: [] as { path: string; sha: string | null }[],
    created: {} as Record<string, unknown>,
  };
  await page.route("https://api.github.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/user") return json({ login: "ada", id: 42 });
    if (path === "/user/memberships/orgs")
      return json([
        { organization: { login: "sample-study-group" }, role: "admin" },
      ]);
    if (path === "/user/repos" && method === "POST") {
      state.created = route.request().postDataJSON();
      return json(
        {
          full_name: "ada/" + state.created.name,
          default_branch: "main",
          private: state.created.private,
          size: 1,
        },
        state.denied ? 403 : 201,
      );
    }
    if (path === "/repos/ada/sample-reading-library")
      return json({
        full_name: "ada/sample-reading-library",
        private: state.private,
        size: state.size,
        default_branch: "main",
      });
    if (/^\/repos\/[^/]+\/sample-new/.test(path)) return json({}, 404);
    if (path.includes("/git/ref/")) return json({ object: { sha: "head" } });
    if (path.includes("/git/commits/")) return json({ tree: { sha: "base" } });
    if (path.endsWith("/git/trees/base"))
      return json({
        tree: [
          { path: "replication-notes.ts", sha: "code", mode: "100644" },
          ...(state.conflict
            ? [
                {
                  path: "semester-5/week-2/sample-public-review.txt",
                  sha: "upstream",
                  mode: "100644",
                },
              ]
            : []),
        ],
      });
    if (method !== "GET") {
      if (path.endsWith("/git/blobs")) state.blobs++;
      if (path.endsWith("/git/trees"))
        state.tree = route.request().postDataJSON().tree;
      if (path.endsWith("/git/commits")) {
        state.commits++;
        state.message = route.request().postDataJSON().message;
      }
      return json({ sha: "sample-commit" });
    }
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
  await page.getByLabel("GitHub token").fill("sample-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(
    page.locator('input[type="file"][aria-label="Upload files"]'),
  ).toBeAttached();
  return state;
}
async function accessibility(page: Page) {
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
}
async function upload(page: Page, names: string[]) {
  await page
    .locator('input[type="file"][aria-label="Upload files"]')
    .setInputFiles(
      names.map((name) => ({
        name,
        mimeType: "text/plain",
        buffer: Buffer.from("Sample staged document"),
      })),
    );
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("repository creation defaults, public consent and permission fallback", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.keyboard.press("Alt+n");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Visibility", exact: true }),
  ).toHaveValue("private");
  await expect(page.getByLabel("Add a README file")).toBeChecked();
  await page.getByLabel("Repository name").fill("sample-new-notes");
  await expect(page.getByText("Name available", { exact: true })).toBeVisible();
  await accessibility(page);
  await page.screenshot({ path: "docs/m3b/create-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({ path: "docs/m3b/create-dark.png" });
  await page
    .getByRole("combobox", { name: "Visibility", exact: true })
    .selectOption("public");
  await expect(
    page.getByRole("button", { name: "Create repository", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: /Everything I push/ }),
  ).not.toBeChecked();
  await page
    .getByRole("combobox", { name: "Visibility", exact: true })
    .selectOption("private");
  await page
    .getByRole("button", { name: "Create repository", exact: true })
    .click();
  await expect(page).toHaveURL(/sample-new-notes@main/);
  expect(state.created).toMatchObject({ private: true, auto_init: true });
  await page.keyboard.press("Alt+n");
  await page.getByLabel("Repository name").fill("sample-new-denied");
  await expect(page.getByText("Name available", { exact: true })).toBeVisible();
  state.denied = true;
  await page
    .getByRole("button", { name: "Create repository", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Create on github.com" }),
  ).toHaveAttribute("href", "https://github.com/new");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "This token cannot create repositories",
  );
});
test("folder destination, generated message, atomic push, pin and quick exclusions", async ({
  page,
}) => {
  test.setTimeout(60000);
  const state = await fixture(page);
  await upload(page, ["sample-a.pdf", "sample-b.pdf", "sample-c.png"]);
  await page.keyboard.press("Alt+p");
  await expect(page.locator("[data-quick-push]")).toHaveCount(0);
  await page.getByText("Change destination", { exact: true }).click();
  await page
    .getByLabel("Folder path (empty means root)")
    .fill("semester-5/week-2");
  await page.getByLabel("Always push here").check();
  await page.getByRole("button", { name: "Apply destination" }).click();
  await expect(page.getByLabel("Commit message")).toHaveValue(
    "Add 3 files to semester-5/week-2 (2 PDFs, 1 image)",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Push", exact: true })
    .click();
  await expect(page.getByText("Push completed", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(state.commits).toBe(1);
  expect(state.tree.map((c) => c.path).sort()).toEqual(
    ["sample-a.pdf", "sample-b.pdf", "sample-c.png"].map(
      (n) => "semester-5/week-2/" + n,
    ),
  );
  await expect(
    page.getByRole("link", { name: "View commit on GitHub" }),
  ).toHaveAttribute("href", /\/commit\/sample-commit$/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await upload(page, ["sample-d.pdf", "sample-e.pdf", "sample-f.png"]);
  await page.keyboard.press("Alt+p");
  await expect(page.locator("[data-quick-push]")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("semester-5/week-2");
  await accessibility(page);
  await page.screenshot({ path: "docs/m3b/quick-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({ path: "docs/m3b/quick-dark.png" });
  await page.getByLabel("Commit message").fill("Add the sample reading pack");
  await page
    .getByRole("button", {
      name: "Push to ada/sample-reading-library/semester-5/week-2",
      exact: true,
    })
    .click();
  await expect(page.getByText("Push completed", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(state.commits).toBe(2);
  expect(state.message).toBe("Add the sample reading pack");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await upload(page, ["sample-public-review.txt"]);
  state.private = false;
  await page.keyboard.press("Alt+p");
  await expect(
    page.getByRole("heading", { name: "Pending review", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-quick-push]")).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  state.private = true;
  for (const size of [500 * 1024, 5120 * 1024]) {
    state.size = size;
    await page.keyboard.press("Alt+p");
    await expect(
      page.getByRole("heading", { name: "Pending review", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-quick-push]")).toHaveCount(0);
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
  state.size = 1024;
  state.conflict = true;
  await page.keyboard.press("Alt+p");
  await expect(
    page.getByRole("heading", { name: "Pending review", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-quick-push]")).toHaveCount(0);
});
test("cut/paste stages a blob-preserving rename and shortcuts remap in Settings", async ({
  page,
}) => {
  const state = await fixture(page);
  await page
    .getByRole("button", { name: "replication-notes.ts", exact: true })
    .click();
  const selected = page.getByRole("row", { selected: true });
  await expect(selected).toContainText("replication-notes.ts");
  await selected.focus();
  await page.keyboard.press("Control+x");
  await page.evaluate(
    () => (location.hash = "#/gh/ada/sample-reading-library@main/empty"),
  );
  await expect(page.getByRole("grid")).toBeVisible();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("replication-notes.ts");
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Alt+p");
  await expect(page.getByLabel("Commit message")).toHaveValue(
    "Rename replication-notes.ts to replication-notes.ts",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Push", exact: true })
    .click();
  await expect(page.getByText("Push completed", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(state.blobs).toBe(0);
  expect(state.tree).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "replication-notes.ts", sha: null }),
      expect.objectContaining({
        path: "empty/replication-notes.ts",
        sha: "code",
      }),
    ]),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/settings\/keyboard/);
  await page.getByLabel("New repository", { exact: true }).fill("Alt+k");
  await accessibility(page);
  await page.screenshot({ path: "docs/m3b/settings-light.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({ path: "docs/m3b/settings-dark.png" });
  await page.getByRole("button", { name: "Save shortcuts" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Alt+k");
  await expect(
    page.getByRole("heading", { name: "Create repository", exact: true }),
  ).toBeVisible();
});
test("repository styleguide specimens cover validation, public consent and fallback in both themes", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/styleguide");
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    await page
      .getByRole("button", { name: "Create repository", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Create repository",
      exact: true,
    });
    await dialog.getByLabel("Repository name").fill("bad name");
    await expect(dialog.getByRole("status")).toContainText(
      "Replace spaces with hyphens",
    );
    await dialog.getByLabel("Repository name").fill("sample-taken");
    await expect(dialog.getByRole("status")).toContainText("Name unavailable");
    await dialog.getByLabel("Repository name").fill("sample-free");
    await expect(dialog.getByRole("status")).toContainText("Name available");
    await dialog
      .getByRole("combobox", { name: "Visibility", exact: true })
      .selectOption("public");
    await expect(
      dialog.getByRole("button", { name: "Create repository", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("checkbox", { name: /Everything I push/ }).check();
    await dialog
      .getByRole("button", { name: "Create repository", exact: true })
      .click();
    await expect(
      dialog.getByRole("link", { name: "Create on github.com" }),
    ).toBeVisible();
    await accessibility(page);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  }
});
