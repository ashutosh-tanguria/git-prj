import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "pdf-lib";

export async function pdfFixture(pages: number, exactSize?: number) {
  const document = await PDFDocument.create();
  for (let number = 1; number <= pages; number++) {
    const page = document.addPage();
    page.drawText(
      number === 12 ? "tidal archive signal" : "Library reading page " + number,
      { x: 35, y: 690 },
    );
  }
  const pdf = Buffer.from(await document.save());
  if (!exactSize || exactSize <= pdf.length) return pdf;
  // Put inert comment bytes before the final trailer pointer so xref offsets stay valid.
  const trailer = pdf.lastIndexOf(Buffer.from("startxref"));
  const padding = Buffer.alloc(exactSize - pdf.length, 32);
  for (let index = 0; index < padding.length - 1; index += 70) {
    padding[index] = 37;
    if (index + 69 < padding.length) padding[index + 69] = 10;
  }
  padding[padding.length - 1] = 10;
  return Buffer.concat([
    pdf.subarray(0, trailer),
    padding,
    pdf.subarray(trailer),
  ]);
}

export async function connectFixture(page: Page, pdf: Buffer) {
  await page.route("https://api.github.com/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/user") return route.fulfill({ json: { login: "ada" } });
    if (pathname === "/user/repos")
      return route.fulfill({
        json: [
          { full_name: "ada/notes", default_branch: "main", private: true },
        ],
      });
    if (pathname.endsWith("/git/trees/main"))
      return route.fulfill({
        json: {
          tree: [
            {
              path: "archive.pdf",
              sha: "edition-1",
              type: "blob",
              mode: "100644",
              size: pdf.length,
            },
          ],
        },
        headers: { etag: '"edition-1"' },
      });
    if (pathname.endsWith("/contents/archive.pdf"))
      return route.fulfill({ body: pdf, contentType: "application/pdf" });
    if (pathname.endsWith("/commits")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/#/gh/ada/notes@main/");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByLabel("GitHub token").fill("local-test-token");
  await page.getByRole("button", { name: "Validate token" }).click();
  await page.getByRole("button", { name: "archive.pdf" }).dblclick();
  await expect(
    page.locator('[data-pdf-page="1"][data-rendered="true"]'),
  ).toBeVisible();
}

test("acceptance 12 finds a cached phrase and highlights page 12", async ({
  page,
}) => {
  await connectFixture(page, await pdfFixture(13));
  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Commands and search" });
  await field.fill("? tidal archive signal");
  const result = page.getByRole("option", {
    name: /archive.pdf.*Page 12.*tidal archive signal/,
  });
  await expect(result.locator("mark")).toHaveText("tidal archive signal");
  await field.press("ArrowDown");
  await field.press("Enter");
  await expect(page.locator('[data-pdf-page="12"] mark')).toHaveText(
    "tidal archive signal",
  );
});

test("filters the current folder and navigates palette modes with the keyboard", async ({
  page,
}) => {
  await connectFixture(page, await pdfFixture(2));
  await page.goBack();
  const file = page
    .getByRole("grid")
    .getByRole("button", { name: "archive.pdf" });
  await file.focus();
  await page.keyboard.press("Control+f");
  const search = page.getByRole("searchbox", { name: "Search this folder" });
  await expect(search).toBeFocused();
  await search.fill("missing name");
  await expect(file).toHaveCount(0);
  await search.press("Escape");
  await expect(file).toBeVisible();

  await page.keyboard.press("Control+k");
  const field = page.getByRole("combobox", { name: "Commands and search" });
  await expect(field).toBeFocused();
  await field.fill("#");
  await expect(page.getByText("No tags yet", { exact: true })).toBeVisible();
  await field.fill("> export");
  await expect(
    page.getByRole("option", { name: /Export selection as ZIP/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await field.press("Enter");
  await expect(field).toBeVisible();
  await field.fill("@ ada");
  await expect(page.getByRole("option", { name: /ada\/notes/ })).toBeVisible();
  await field.fill("/ archive");
  await expect(page.getByRole("option", { name: /archive.pdf/ })).toBeVisible();
  await field.press("ArrowDown");
  await field.press("Enter");
  await expect(
    page.getByRole("heading", { name: "archive.pdf" }),
  ).toBeVisible();
});

test("acceptance 8 restores page 50 of a 20 MB PDF while offline after reload", async ({
  page,
  context,
}) => {
  const fixture = await pdfFixture(51, 20_000_000);
  expect(fixture.length).toBe(20_000_000);
  await connectFixture(page, fixture);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const pageNumber = page.getByRole("spinbutton", { name: "Page" });
  await pageNumber.fill("50");
  await expect(
    page.locator('[data-pdf-page="50"][data-rendered="true"]'),
  ).toBeVisible();
  await page.route("https://api.github.com/**", (route) =>
    route.abort("internetdisconnected"),
  );
  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(pageNumber).toHaveValue("50");
  await expect(
    page.locator('[data-pdf-page="50"][data-rendered="true"]'),
  ).toBeVisible();
});

test("acceptance 17 drops cache, staged bytes, preferences and the provider session", async ({
  page,
}) => {
  await connectFixture(page, await pdfFixture(2));
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const staged = await root.getDirectoryHandle("staged", { create: true });
    const blob = await staged.getFileHandle("test-draft", { create: true });
    const stream = await blob.createWritable();
    await stream.write("pending contents");
    await stream.close();
    localStorage.setItem("test-setting", "present");
    sessionStorage.setItem("test-session", "present");
    await (
      await caches.open("shelf-test-wipe")
    ).put("/test-cache", new Response("cache value"));
  });
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Commands and search" })
    .fill("> wipe");
  await page.getByRole("option", { name: /Wipe all local data/ }).click();
  await page.getByRole("button", { name: "Wipe and sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Disconnect", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }),
  ).toBeVisible();
  const storage = await page.evaluate(async () => {
    const rows: string[] = [];
    for await (const name of (await navigator.storage.getDirectory()).keys())
      rows.push(name);
    const dbs = await indexedDB.databases();
    const counts: number[] = [];
    for (const name of ["shelf-library", "shelf-working-copy"]) {
      if (!dbs.some((row) => row.name === name)) continue;
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const store of Array.from(database.objectStoreNames)) {
        counts.push(
          await new Promise<number>((resolve, reject) => {
            const request = database
              .transaction(store)
              .objectStore(store)
              .count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
        );
      }
      database.close();
    }
    return {
      rows,
      counts,
      saved: localStorage.getItem("test-setting"),
      session: sessionStorage.getItem("test-session"),
      extraCache: (await caches.keys()).includes("shelf-test-wipe"),
    };
  });
  expect(storage).toEqual({
    rows: [],
    counts: storage.counts.map(() => 0),
    saved: null,
    session: null,
    extraCache: false,
  });
});

test("Hindi search and Storage specimens reflow and remain accessible", async ({
  page,
}) => {
  await page.goto("/#/styleguide");
  await page.getByLabel("Language").selectOption("hi");
  await page.setViewportSize({ width: 360, height: 800 });
  const specimen = page.locator("#search-specimens");
  await expect(
    specimen.getByRole("combobox", { name: "कमांड और खोज" }),
  ).toBeVisible();
  await expect(specimen.getByRole("heading", { name: "स्टोरेज" })).toBeVisible();
  await expect(
    specimen.getByText("यह फ़ाइल ऑफ़लाइन उपलब्ध नहीं है।"),
  ).toBeVisible();
  await expect(specimen.getByText(/सेटिंग में कैश साफ़ करें/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page }).include("#search-specimens").analyze()
    ).violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
});
