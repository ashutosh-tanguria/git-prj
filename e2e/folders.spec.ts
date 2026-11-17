import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
const folder = "sample-week-5";
const files = [
  { path: "sample-a.pdf", sha: "a", size: 2, mode: "100644", type: "blob" },
  { path: "sample-b.txt", sha: "b", size: 2, mode: "100644", type: "blob" },
  { path: "nested", sha: "nested", mode: "040000", type: "tree" },
  {
    path: "nested/sample-c.txt",
    sha: "c",
    size: 2,
    mode: "100644",
    type: "blob",
  },
];
let collide = false,
  commits = 0,
  blobs = 0;
let written: { path: string; sha: string | null }[] = [];
const server = setupServer(
  http.all("https://api.github.com/*", async ({ request }) => {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") {
      if (path.endsWith("/git/commits")) commits++;
      if (path.endsWith("/git/blobs")) blobs++;
      if (path.endsWith("/git/trees"))
        written = ((await request.json()) as { tree: typeof written }).tree;
      return HttpResponse.json({ sha: "next" });
    }
    const repo = {
      full_name: "ada/sample-notes",
      default_branch: "main",
      private: true,
      size: 0,
    };
    if (path === "/user") return HttpResponse.json({ login: "ada", id: 42 });
    if (path === "/user/repos") return HttpResponse.json([repo]);
    if (path === "/repos/ada/sample-notes") return HttpResponse.json(repo);
    if (path.includes("/git/ref/"))
      return HttpResponse.json({ object: { sha: "head" } });
    if (path.includes("/git/commits/"))
      return HttpResponse.json({ tree: { sha: "root" } });
    const roots = [
      { path: folder, sha: "source", type: "tree", mode: "040000" },
      ...(collide
        ? [{ path: "sample-week-6", sha: "dest", type: "tree", mode: "040000" }]
        : []),
    ];
    if (path.endsWith("/git/trees/main"))
      return HttpResponse.json({ tree: roots });
    if (path.endsWith("/git/trees/root"))
      return HttpResponse.json({
        sha: "root",
        tree: [
          ...roots,
          ...files.map((n) => ({ ...n, path: folder + "/" + n.path })),
          ...(collide
            ? [
                {
                  path: "sample-week-6/obsolete.txt",
                  sha: "old",
                  type: "blob",
                  mode: "100644",
                  size: 2,
                },
              ]
            : []),
        ],
      });
    if (path.endsWith("/git/trees/source"))
      return HttpResponse.json({ sha: "source", tree: files });
    if (path.includes("/commits")) return HttpResponse.json([]);
    return HttpResponse.json({}, { status: 404 });
  }),
);
test.beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
test.afterAll(() => server.close());
test.beforeEach(() => {
  collide = false;
  commits = blobs = 0;
  written = [];
});
async function connect(page: Page) {
  await page.route("https://api.github.com/**", async (route) => {
    const r = await fetch(route.request().url(), {
      method: route.request().method(),
      headers: route.request().headers(),
      body: route.request().postData() || undefined,
    });
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      body: Buffer.from(await r.arrayBuffer()),
    });
  });
  await page.goto("/#/gh/ada/sample-notes@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("sample-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(
    page.locator('input[aria-label="Upload folder"]'),
  ).toBeAttached();
}
async function rename(page: Page) {
  await page.getByRole("button", { name: folder, exact: true }).click();
  await page.getByRole("row", { selected: true }).focus();
  await page.keyboard.press("F2");
  await page.getByLabel("Name", { exact: true }).fill("sample-week-6");
  await page.getByRole("button", { name: "Review staged operation" }).click();
}
async function axe(page: Page) {
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
}
test("folder rename is one undo group and one commit without blob uploads", async ({
  page,
}) => {
  await connect(page);
  await rename(page);
  await expect(page.getByRole("dialog")).toContainText(
    "sample-week-6/nested/sample-c.txt",
  );
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("3 files");
  await expect(
    page.getByRole("button", { name: "Discard", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Discard", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Discard", exact: true }),
  ).toHaveCount(1);
  await axe(page);
  if (process.env.M3C_CAPTURE) {
    await page.screenshot({ path: "docs/m3c/linked-light.png" });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await page.screenshot({ path: "docs/m3c/linked-dark.png" });
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Push", exact: true })
    .click();
  await expect(page.getByText("Push completed", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(commits).toBe(1);
  expect(blobs).toBe(0);
  expect(written.filter((n) => n.sha === null)).toHaveLength(3);
});
test("folder collision offers three explicit choices and replaces only after review", async ({
  page,
}) => {
  collide = true;
  await connect(page);
  await rename(page);
  const collision = page.getByRole("region", {
    name: "Destination already exists",
    exact: true,
  });
  await expect(collision).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stage files", exact: true }),
  ).toHaveCount(0);
  await axe(page);
  if (process.env.M3C_CAPTURE)
    await page.screenshot({ path: "docs/m3c/collision-light.png" });
  await collision
    .getByRole("button", { name: "Keep both", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "sample-week-6 (shelf copy)/sample-a.pdf",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await rename(page);
  await collision.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await rename(page);
  await collision.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "sample-week-6/obsolete.txt",
  );
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(commits).toBe(0);
});
test("OS directory drops stop above the cap and directory picker preserves prefixes", async ({
  page,
}) => {
  await connect(page);
  await page.evaluate(() => {
    let batch = 0;
    const directory = {
      name: "sample-over-cap",
      isDirectory: true,
      isFile: false,
      createReader: () => ({
        readEntries: (ok: (entries: unknown[]) => void) =>
          ok(
            batch++
              ? []
              : Array.from({ length: 2001 }, (_, i) => ({
                  name: "sample-" + i + ".txt",
                  isFile: true,
                  isDirectory: false,
                  file: (ok: (file: File) => void) =>
                    ok(new File(["xx"], "sample-" + i + ".txt")),
                })),
          ),
      }),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", {
      value: {
        types: ["Files"],
        items: [{ kind: "file", webkitGetAsEntry: () => directory }],
        files: [],
      },
    });
    window.dispatchEvent(event);
  });
  await expect(page.getByRole("alert")).toContainText("2,000 files");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator('input[aria-label="Upload folder"]')
    .setInputFiles(resolve("fixtures/sample-folder-upload"));
  await expect(page.getByRole("dialog")).toContainText(
    "sample-folder-upload/nested/sample-c.txt",
  );
  await page.getByRole("button", { name: "Stage files", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pending review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("3 files");
  expect(commits).toBe(0);
});

test("folder specimens retain named controls and reflow in both themes and Hindi", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.goto("/?theme=" + theme + "#/styleguide");
    await page.getByLabel("Language").selectOption("hi");
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(
      page.getByText("sample-notes/semester-6", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await axe(page);
  }
});
