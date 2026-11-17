import { mkdirSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { uiServer, setMode, releaseConnect } from "./ui-fixtures";
const stage = process.env.UI_CAPTURE_STAGE;
const rootRef = "gh:ada/sample-reading-library@main/";
const rootRoute = "/#/gh/ada/sample-reading-library@main/";
if (stage === "before" || stage === "after") {
  test.beforeAll(() => uiServer.listen({ onUnhandledFrame: "bypass" }));
  test.afterAll(() => uiServer.close());
  for (const width of [1440, 1024, 360])
    for (const theme of ["light", "dark"]) {
      test(
        "UI review " + stage + " " + width + " " + theme,
        async ({ page }) => {
          test.setTimeout(240000);
          setMode("normal");
          await page.setViewportSize({
            width,
            height: width === 360 ? 800 : 1000,
          });
          await page.clock.setFixedTime(new Date("2026-11-16T12:00:00Z"));

          const folder = "docs/ui-" + stage + "/" + theme + "-" + width;
          mkdirSync(folder, { recursive: true });
          const captures: { state: string; file: string; metrics: unknown }[] =
            [];
          async function shot(state: string, fullPage = false) {
            await page.evaluate((theme) => {
              document.documentElement.dataset.theme = theme;
            }, theme);
            await page.evaluate(() => document.fonts.ready);
            const file = state + ".png";
            await page.screenshot({
              path: folder + "/" + file,
              fullPage,
              animations: "disabled",
              caret: "hide",
            });
            const metrics = await page.evaluate(() => {
              const rect = (selector: string) => {
                const node = document.querySelector(selector);
                if (!node) return null;
                const r = node.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              };
              return {
                viewport: { width: innerWidth, height: innerHeight },
                documentWidth: document.documentElement.scrollWidth,
                main: rect("#fileList"),
                list: rect('[role="grid"]'),
                pending: rect("#pending"),
                status: rect("footer"),
                font: getComputedStyle(document.body).fontFamily,
              };
            });
            captures.push({ state, file, metrics });
          }
          await page.route("https://api.github.com/**", async (route) => {
            try {
              const response = await fetch(route.request().url(), {
                headers: route.request().headers(),
              });
              await route.fulfill({
                status: response.status,
                contentType:
                  response.headers.get("content-type") || "application/json",
                body: Buffer.from(await response.arrayBuffer()),
              });
            } catch {
              if (!page.isClosed()) await route.abort();
            }
          });
          await page.goto(rootRoute);
          await expect(page.getByLabel("GitHub token")).toBeVisible();
          await shot("connect");
          await page.keyboard.press("Tab");
          await page.getByLabel("GitHub token").focus();
          await shot("connect-focus");
          setMode("auth-error");
          await page.getByLabel("GitHub token").fill("sample-ui-review-token");
          await page.getByRole("button", { name: "Validate token" }).click();
          await expect(page.getByRole("alert")).toBeVisible();
          await shot("connect-error");
          setMode("busy");
          await page.getByLabel("GitHub token").fill("sample-ui-review-token");
          await page.getByRole("button", { name: "Validate token" }).click();
          await expect(
            page.getByRole("button", { name: "Validate token" }),
          ).toBeDisabled();
          await shot("connect-busy");
          setMode("normal");
          releaseConnect();
          const grid = page.getByRole("grid");
          await expect(grid).toBeVisible();
          if (width >= 640)
            await expect(
              grid.getByText("Sample: add seminar reading notes").first(),
            ).toBeVisible();
          else
            await expect(
              grid
                .locator(
                  '[role="gridcell"][title="Sample: add seminar reading notes"]',
                )
                .first(),
            ).toHaveAttribute("title", "Sample: add seminar reading notes");
          await page.locator("#fileList").focus();
          await shot("explorer-list");
          if (stage === "after" && width === 1440) {
            mkdirSync("docs/ui-after/reviews", { recursive: true });
            for (const [filter, name] of [
              ["grayscale(1)", "grayscale"],
              ["blur(2px)", "squint"],
            ]) {
              await page.evaluate((filter) => {
                document.documentElement.style.filter = filter;
              }, filter);
              await page.screenshot({
                path: "docs/ui-after/reviews/" + theme + "-" + name + ".png",
                animations: "disabled",
                caret: "hide",
              });
            }
            await page.evaluate(() => {
              document.documentElement.style.filter = "";
            });
          }

          const notes = grid.getByRole("button", {
            name: "operating-systems.md",
            exact: true,
          });
          await notes.hover();
          await shot("explorer-hover");
          await page.mouse.move(0, 0);
          await grid.locator('[data-index="0"]').focus();
          await shot("explorer-focus");
          await notes.click();
          if (width >= 1200)
            await expect(
              page.getByRole("heading", {
                name: "Sample reading room notes",
                exact: true,
              }),
            ).toBeVisible();
          await shot("selection-single");
          await grid
            .getByRole("button", { name: "replication-notes.ts", exact: true })
            .click({ modifiers: ["Control"] });
          await shot("selection-multiple");
          await page.getByText("Columns", { exact: true }).click();
          await shot("columns-open");
          await page.getByText("Columns", { exact: true }).click();
          if (width < 1200)
            await page
              .getByRole("button", { name: "Inspector", exact: true })
              .click();
          await page.getByRole("tab", { name: "Details", exact: true }).click();
          await shot("inspector-details");
          if (width < 900) await page.keyboard.press("Escape");
          await notes.click();
          if (width < 900)
            await page
              .getByRole("button", { name: "Inspector", exact: true })
              .click();
          await page.getByRole("tab", { name: "Preview", exact: true }).click();
          await expect(
            page.getByRole("heading", {
              name: "Sample reading room notes",
              exact: true,
            }),
          ).toBeVisible();
          await shot("inspector-preview");
          if (width < 900) await page.keyboard.press("Escape");
          await notes.click({ modifiers: ["Control"] });
          if (width < 900)
            await page
              .getByRole("button", { name: "Inspector", exact: true })
              .click();
          await shot("inspector-empty");
          if (width < 900) await page.keyboard.press("Escape");
          if (width < 900)
            await page
              .getByRole("button", { name: "Locations", exact: true })
              .click();
          const tree = page.getByRole("tree");
          await tree
            .getByRole("treeitem", {
              name: "ada/sample-reading-library",
              exact: true,
            })
            .focus();
          await page.keyboard.press("ArrowRight");
          await expect(
            tree.getByRole("treeitem", { name: "empty", exact: true }),
          ).toBeVisible();
          await shot("locations-open");
          if (width < 900) await page.keyboard.press("Escape");
          if (width < 900)
            await expect(
              page.getByRole("button", { name: "Locations", exact: true }),
            ).toBeFocused();
          await grid.focus();
          await page.keyboard.type("distributed");
          await page.keyboard.press("Space");
          await expect(
            page.getByRole("dialog").getByLabel("Page", { exact: true }),
          ).toHaveAttribute("max", "16");
          if (stage === "after")
            await expect(
              page
                .getByRole("dialog")
                .locator('[data-rendered="true"]')
                .first(),
            ).toBeVisible();
          await shot("quick-look");
          await page.keyboard.press("Escape");
          async function view(name: string) {
            await page.evaluate((ref) => {
              location.hash = "#/view/" + encodeURIComponent(ref);
            }, rootRef + name);
            await expect(
              page
                .locator("#fileList")
                .getByRole("heading", { name, exact: true }),
            ).toBeVisible();
          }
          await view("distributed-systems.pdf");
          const reader = page
            .locator("#fileList")
            .getByRole("region", { name: "PDF reader", exact: true });
          async function controls() {
            if (
              !((await reader.locator("details").getAttribute("open")) !== null)
            )
              await reader.locator("summary").click();
          }
          await controls();
          await reader
            .getByRole("button", { name: "Fit page", exact: true })
            .click();
          await expect(
            reader.locator('[data-rendered="true"]').first(),
          ).toBeVisible();
          await shot("pdf-viewer");
          await controls();
          await shot("pdf-controls");
          await reader.getByLabel("PDF sidebar").selectOption("thumbnails");
          if (width === 360) await reader.locator("summary").click();
          await expect(
            reader.getByRole("button", { name: "Page 1", exact: true }),
          ).toBeVisible();
          await shot("pdf-thumbnails");
          await controls();
          await reader.getByLabel("PDF sidebar").selectOption("outline");
          if (width === 360) await reader.locator("summary").click();
          await reader.getByRole("button", { name: "Chapter Seven" }).click();
          await expect(
            reader.locator('[data-rendered="true"]').first(),
          ).toBeVisible();
          await shot("pdf-outline");
          await controls();
          await reader.getByLabel("PDF sidebar").selectOption("none");
          await reader.getByLabel("Search in PDF").fill("needle phrase");
          await reader
            .getByRole("button", { name: "Find", exact: true })
            .click();
          if (width === 360) await reader.locator("summary").click();
          await expect(reader.locator("mark").first()).toBeVisible();
          await shot("pdf-search");
          await view("operating-systems.md");
          await expect(
            page.locator("#fileList").getByRole("heading", {
              name: "Sample reading room notes",
              exact: true,
            }),
          ).toBeVisible();
          await shot("markdown-viewer");
          await view("replication-notes.ts");
          await expect(
            page.locator("#fileList code").filter({ hasText: "type Replica" }),
          ).toBeVisible();
          await shot("code-viewer");
          await page
            .locator("#fileList")
            .getByRole("button", { name: "Wrap text" })
            .click();
          await shot("code-wrapped");
          await view("replication-diagram.svg");
          await expect(
            page
              .locator("#fileList")
              .getByRole("img", { name: "replication-diagram.svg" }),
          ).toBeVisible();
          await shot("image-viewer");
          await view("reading-list.csv");
          await expect(
            page.locator("#fileList").getByRole("table"),
          ).toBeVisible();
          await shot("csv-viewer");
          await view("seminar-notes.html");
          await page
            .locator("#fileList")
            .getByRole("button", { name: "Run preview", exact: true })
            .waitFor();
          await shot("html-source");
          await page
            .locator("#fileList")
            .getByRole("button", { name: "Run preview", exact: true })
            .click();
          await expect(
            page
              .frameLocator("iframe")
              .getByRole("heading", { name: "Sample seminar notes" }),
          ).toBeVisible();
          await shot("html-preview");
          await view("seminar-recording.wav");
          await expect(page.locator("#fileList audio")).toBeVisible();
          await shot("media-viewer");
          await view("research-archive.zip");
          await shot("unsupported-viewer");
          await page.evaluate(() => {
            location.hash = "#/gh/ada/sample-reading-library@main/empty";
          });
          await expect(
            page.getByText("No files here.", { exact: false }),
          ).toBeVisible();
          await shot("empty-folder");
          setMode("list-error");
          await page.evaluate(() => {
            location.hash = "#/gh/ada/sample-reading-library@main/";
          });
          await expect(page.getByRole("alert")).toBeVisible();
          await shot("listing-error");
          setMode("normal");
          await view("corrupt.pdf");
          await expect(
            page.locator("#fileList").getByRole("alert"),
          ).toBeVisible();
          await shot("pdf-error");
          await page.context().setOffline(true);
          await expect(page.getByText(/Offline/).first()).toBeVisible();
          await shot("offline-status");
          await page.context().setOffline(false);
          for (const density of ["compact", "default", "comfortable"]) {
            await page.goto(
              "/?theme=" + theme + "&density=" + density + "#/styleguide",
            );
            await expect(
              page.getByRole("heading", { name: "Styleguide", exact: true }),
            ).toBeVisible();
            await shot("styleguide-" + density, true);
          }
          writeFileSync(
            folder + "/manifest.json",
            JSON.stringify(
              {
                stage,
                width,
                theme,
                fixture: "Labelled sample GitHub library; no real account",
                unavailable: [
                  "Explorer Grid view is not implemented. The existing list uses the ARIA grid pattern. No new view was added.",
                ],
                captures,
              },
              null,
              2,
            ) + "\n",
          );
        },
      );
    }
}
