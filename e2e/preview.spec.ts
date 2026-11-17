import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { auditPreviewMessages } from "./previewAudit";
const staticFiles: Record<string, string | Uint8Array> = {
  "docs/index.html":
    '<!doctype html><html lang="en"><title>Reading room</title><h1>Sample static reading room</h1><p id="data"></p><img alt="Reading diagram" src="/assets/diagram.svg"><script type="module" src="/assets/app.js"></script>',
  "docs/assets/app.js":
    'document.querySelector("#data").textContent = (await (await fetch("/data.json")).json()).reading; fetch("/missing.json").catch(()=>{}); fetch("https://api.github.com/blocked-preview").catch(()=>{});',
  "docs/assets/diagram.svg":
    '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><title>Sample diagram</title><rect width="50" height="50" /></svg>',
  "docs/data.json": '{"reading":"Relative JSON loaded"}',
  "source/package.json": '{"dependencies":{"vite":"sample"}}',
  "lecture.wav": new Uint8Array(
    readFileSync("fixtures/sample-reading-note.wav"),
  ),
};
const contentBytes = (value: string | Uint8Array) =>
  typeof value === "string" ? new TextEncoder().encode(value) : value;
async function fixture(
  page: Page,
  options: {
    pages?: boolean;
    extra?: Record<string, Uint8Array>;
    reads: string[];
  },
) {
  const source = { ...staticFiles, ...options.extra };
  const node = (path: string, relative = path) => ({
    path: relative,
    sha: encodeURIComponent(path),
    type: "blob",
    mode: "100644",
    size: contentBytes(source[path]).byteLength,
  });
  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const path = decodeURIComponent(url.pathname);
    let data: unknown;
    if (path === "/user") data = { login: "ada" };
    else if (path === "/user/repos")
      data = [
        {
          full_name: "ada/preview",
          default_branch: "main",
          private: true,
          size: 64,
        },
      ];
    else if (path.endsWith("/pages")) {
      if (!options.pages) {
        await route.fulfill({ status: 404, json: {} });
        return;
      }
      data = { html_url: "https://ada.github.io/preview/" };
    } else if (path.includes("/git/ref/")) data = { object: { sha: "head" } };
    else if (path.endsWith("/git/commits/head"))
      data = { tree: { sha: "complete" } };
    else if (path.endsWith("/git/trees/complete"))
      data = { tree: Object.keys(source).map((name) => node(name)) };
    else if (path.includes("/git/trees/")) {
      const id = path.split("/git/trees/")[1];
      data = {
        truncated: false,
        tree:
          id === "main"
            ? [
                ...["docs", "source"].map((name) => ({
                  path: name,
                  sha: name,
                  type: "tree",
                  mode: "040000",
                })),
                ...Object.keys(source)
                  .filter((name) => !name.includes("/"))
                  .map((name) => node(name)),
                {
                  path: "oversized.mp4",
                  sha: "huge",
                  type: "blob",
                  mode: "100644",
                  size: 100 * 1048576 + 1,
                },
              ]
            : Object.keys(source)
                .filter(
                  (name) =>
                    name.startsWith(id + "/") &&
                    !name.slice(id.length + 1).includes("/"),
                )
                .map((name) => node(name, name.slice(id.length + 1))),
      };
    } else if (path.includes("/git/blobs/")) {
      const name = decodeURIComponent(path.split("/git/blobs/")[1]);
      options.reads.push(name);
      if (!(name in source)) {
        await route.fulfill({ status: 404, body: "missing" });
        return;
      }
      await route.fulfill({
        body: Buffer.from(contentBytes(source[name])),
        contentType: name.endsWith("wav")
          ? "audio/wav"
          : name.endsWith("webm")
            ? "video/webm"
            : "application/octet-stream",
      });
      return;
    } else if (path.endsWith("/commits")) data = [];
    else data = { full_name: "ada/preview", private: true, size: 64 };
    await route.fulfill({ json: data });
  });
  await page.goto("/#/gh/ada/preview@main/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("PREVIEW_PROVIDER_TOKEN_SENTINEL");
  await page.getByRole("button", { name: "Validate token" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
}
test("site entry points, lazy assets, SPA reload, request blocking, presets, Stop and hand-offs", async ({
  page,
  context,
}) => {
  const traffic = await auditPreviewMessages(context);
  const requests: string[] = [];
  const origins = new Set<string>();
  context.on("request", (request) => {
    origins.add(new URL(request.url()).origin);
    if (new URL(request.url()).origin !== "https://api.github.com")
      requests.push(request.url() + (request.postData() || ""));
  });
  const reads: string[] = [];
  await fixture(page, { reads, pages: true });
  await page.evaluate(() => {
    localStorage.setItem("shelf-private", "APP_STORAGE_SENTINEL");
    document.cookie = "shelf-private=APP_COOKIE_SENTINEL; SameSite=Strict";
  });
  await page
    .getByRole("navigation", { name: "Library commands" })
    .getByRole("button", { name: "Preview site", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Website preview" });
  await expect(
    panel.getByText("Preview stopped. Press Run to start it."),
  ).toBeVisible();
  expect(reads).toEqual([]);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  const site = page.frameLocator('iframe[title="Website preview"]');
  await expect(
    site.getByRole("heading", { name: "Sample static reading room" }),
  ).toBeVisible();
  await expect(site.locator("#data")).toHaveText("Relative JSON loaded");
  await expect(site.getByRole("img")).toHaveJSProperty("naturalWidth", 50);
  expect(reads.sort()).toEqual(
    Object.keys(staticFiles)
      .filter((name) => name.startsWith("docs/"))
      .sort(),
  );
  await panel.getByLabel("Viewport").selectOption("phone");
  expect(
    await panel
      .locator("iframe")
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(390);
  await panel.getByLabel("Viewport").selectOption("tablet");
  expect(
    await panel
      .locator("iframe")
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(768);
  const child = page.frames().find((frame) => frame.url().includes("/vfs/"))!;
  expect(await child.evaluate(() => document.compatMode)).toBe("CSS1Compat");
  await child.evaluate(() => {
    history.pushState({}, "", "reading/chapter");
    location.reload();
  });
  await expect(site.locator("#data")).toHaveText("Relative JSON loaded");
  await panel.getByText(/^Requests \(/).click();
  await expect(panel.getByText(/Failed:.*missing.json/).first()).toBeVisible();
  await expect(
    panel.getByText(/Blocked:.*api.github.com/).first(),
  ).toBeVisible();
  const oldUrl = child.url();
  await panel.getByRole("button", { name: "Reload", exact: true }).click();
  await expect
    .poll(() =>
      page
        .frames()
        .find((frame) => frame.url().includes("/vfs/"))
        ?.url(),
    )
    .not.toBe(oldUrl);
  await expect(site.locator("#data")).toHaveText("Relative JSON loaded");
  await expect
    .poll(() => traffic.some((value) => value.includes('"type":"file"')))
    .toBe(true);
  for (const secret of [
    "PREVIEW_PROVIDER_TOKEN_SENTINEL",
    "APP_STORAGE_SENTINEL",
    "APP_COOKIE_SENTINEL",
  ])
    expect(traffic.join("\n") + requests.join("\n")).not.toContain(secret);
  expect(
    [...origins].filter(
      (origin) =>
        ![
          "http://127.0.0.1:4173",
          "http://127.0.0.1:4174",
          "https://api.github.com",
        ].includes(origin),
    ),
  ).toEqual([]);
  await panel.getByText("Open in new tab", { exact: true }).click();
  await expect(
    panel.getByRole("link", { name: "Open on GitHub Pages" }),
  ).toHaveAttribute("href", "https://ada.github.io/preview/");
  await expect(
    panel.getByRole("link", { name: "Open in StackBlitz" }),
  ).toHaveAttribute(
    "href",
    "https://stackblitz.com/github/ada/preview/tree/main/docs",
  );
  await expect(
    panel.getByRole("link", { name: "Open in Codespaces" }),
  ).toHaveAttribute("href", "https://codespaces.new/ada/preview/tree/main");
  await expect(
    panel.getByRole("link", { name: "Open in CodeSandbox" }),
  ).toHaveAttribute("href", "https://codesandbox.io/s/new");
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((value) =>
      ["serious", "critical"].includes(value.impact || ""),
    ),
  ).toEqual([]);
  const stoppedUrl =
    page
      .frames()
      .find((frame) => frame.url().includes("/vfs/"))
      ?.url() || oldUrl;
  await panel.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(panel.locator("iframe")).toHaveCount(0);
  const stopped = page.waitForResponse(
    (response) => response.url() === stoppedUrl && response.status() === 410,
  );
  await page.evaluate((url) => {
    const probe = document.createElement("iframe");
    probe.title = "Stopped session probe";
    probe.sandbox.add("allow-scripts", "allow-same-origin");
    probe.src = url;
    document.body.append(probe);
  }, stoppedUrl);
  await stopped;
  await page
    .locator('iframe[title="Stopped session probe"]')
    .evaluate((node) => node.remove());
  await panel.getByRole("button", { name: "Close preview" }).click();
  await page.getByRole("button", { name: "docs", exact: true }).click();
  await page
    .locator("#inspector")
    .getByRole("button", { name: "Preview site", exact: true })
    .click();
  await panel.getByRole("button", { name: "Close preview" }).click();
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "docs", exact: true }) })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Preview site" }).click();
  await panel.getByRole("button", { name: "Close preview" }).click();
  await page.getByRole("button", { name: "source", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Library commands" })
    .getByRole("button", { name: "Preview site", exact: true })
    .click();
  await expect(
    panel.getByText(
      "This site needs a server. Open it in StackBlitz or on GitHub Pages.",
    ),
  ).toBeVisible();
});
test("native audio/video play, keyboard controls, persistent OPFS cache and the 100 MB notice", async ({
  page,
}) => {
  await page.goto("/");
  const video = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const stream = canvas.captureStream(10),
      recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    canvas.getContext("2d")?.fillRect(0, 0, 32, 32);
    await new Promise((resolve) => setTimeout(resolve, 300));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const reads: string[] = [];
  await fixture(page, {
    reads,
    extra: { "lecture.webm": new Uint8Array(video) },
  });
  for (const name of ["lecture.wav", "lecture.webm"]) {
    await page.getByRole("button", { name, exact: true }).dblclick();
    const player = page.getByRole("region", { name: "Media player: " + name });
    await expect(player.locator("audio,video")).toHaveJSProperty(
      "readyState",
      4,
    );
    await expect(page.getByText(/^Cached /).first()).toBeVisible();
    await player.focus();
    await page.keyboard.press("Space");
    await expect(player.locator("audio,video")).toHaveJSProperty(
      "paused",
      false,
    );
    await page.keyboard.press("Space");
    await expect(player.locator("audio,video")).toHaveJSProperty(
      "paused",
      true,
    );
    await page.keyboard.press("ArrowRight");
    expect(
      await player
        .locator("audio,video")
        .evaluate((node: HTMLMediaElement) => node.currentTime),
    ).toBeGreaterThan(0);
    await page.evaluate(() => history.back());
    await expect(page.getByRole("grid")).toBeVisible();
  }
  const count = reads.length;
  await page.reload();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("PREVIEW_PROVIDER_TOKEN_SENTINEL");
  await page.getByRole("button", { name: "Validate token" }).click();
  await page
    .getByRole("button", { name: "lecture.wav", exact: true })
    .dblclick();
  await expect(page.getByText(/^Cached /).first()).toBeVisible();
  expect(reads.length).toBe(count);
  expect(
    await page.evaluate(async () => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle("media-cache");
      let count = 0;
      for await (const entry of directory.values())
        if (entry.kind === "file") count++;
      return count;
    }),
  ).toBe(2);
  await page.evaluate(() => {
    location.hash =
      "#/view/" + encodeURIComponent("gh:ada/preview@main/oversized.mp4");
  });
  await expect(page.getByRole("alert")).toContainText("above 100 MB");
  expect(reads.length).toBe(count);
});

test("preview specimens reflow in Hindi, light and dark without accessibility violations", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.goto("/?theme=" + theme + "#/styleguide");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByLabel("Language").selectOption("hi");
    await expect(page.locator("#preview-specimens")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page }).include("#preview-specimens").analyze()
      ).violations.filter((value) =>
        ["serious", "critical"].includes(value.impact || ""),
      ),
    ).toEqual([]);
  }
});

test("media progress offers cancellation before provider bytes arrive", async ({
  page,
}) => {
  await fixture(page, { reads: [] });
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://api.github.com/repos/ada/preview/git/blobs/lecture.wav",
    async (route) => {
      await held;
      // Cancellation may already have disposed this intercepted request.
      await route.abort().catch(() => {});
    },
  );
  await page
    .getByRole("button", { name: "lecture.wav", exact: true })
    .dblclick();
  await page
    .getByRole("button", { name: "Cancel download", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Media download stopped");
  release();
  await expect(page.locator("audio")).toHaveCount(0);
});
