import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  detectSite,
  handoffLinks,
  pagesUrl,
  prepareSite,
} from "../src/services/sitePreview";
import { readMedia, MEDIA_CAP } from "../src/services/mediaRead";
import en from "../src/i18n/en/preview.json";
import hi from "../src/i18n/hi/preview.json";
vi.mock("../src/services/mediaCache", () => ({
  getMedia: vi.fn(),
  putMedia: vi.fn(() => Promise.resolve(true)),
  mediaCacheKey: vi.fn(() => Promise.resolve("version-key")),
}));
import { getMedia } from "../src/services/mediaCache";
const ref = { owner: "ada", repo: "site", branch: "feature/read", path: "" };
let bytesRead = 0,
  mediaSize = 4,
  pages = false,
  rootFiles = ["docs"],
  files = ["index.html", "assets/app.js", "data.json"];
const server = setupServer(
  http.get("https://api.github.com/*", ({ request }) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/pages"))
      return pages
        ? HttpResponse.json({ html_url: "https://ada.github.io/site/" })
        : new HttpResponse(null, { status: 404 });
    if (path.includes("/git/ref/"))
      return HttpResponse.json({ object: { sha: "head" } });
    if (path.endsWith("/git/commits/head"))
      return HttpResponse.json({ tree: { sha: "root" } });
    if (path.includes("/git/blobs/")) {
      bytesRead++;
      return new HttpResponse(new Uint8Array([0, 1, 2, 3]));
    }
    if (path.includes("/git/trees/")) {
      if (path.endsWith("/root"))
        return HttpResponse.json({
          tree: files.map((name) => ({
            path: "docs/" + name,
            sha: name,
            mode: "100644",
            size: 4,
          })),
        });
      if (/\/(docs|dist|build|public)$/.test(path))
        return HttpResponse.json({
          tree: [
            {
              path: "index.html",
              type: "blob",
              mode: "100644",
              sha: "html",
              size: 4,
            },
          ],
        });
      return HttpResponse.json({
        tree: rootFiles.map((name) => ({
          path: name,
          type: ["docs", "dist", "build", "public"].includes(name)
            ? "tree"
            : "blob",
          mode: ["docs", "dist", "build", "public"].includes(name)
            ? "040000"
            : "100644",
          sha: name,
          size: name.endsWith("mp4") ? mediaSize : 4,
        })),
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  bytesRead = 0;
  mediaSize = 4;
  pages = false;
  rootFiles = ["docs"];
  files = ["index.html", "assets/app.js", "data.json"];
  vi.mocked(getMedia).mockReset();
});
it("detects built site roots, plain HTML and server projects", async () => {
  for (const directory of ["docs", "dist", "build", "public"]) {
    rootFiles = [directory];
    expect((await detectSite(ref, []))?.ref.path).toBe(directory);
  }
  rootFiles = ["index.html"];
  expect((await detectSite(ref, []))?.server).toBe(false);
  rootFiles = ["package.json"];
  expect((await detectSite(ref, []))?.server).toBe(true);
  rootFiles = ["notes.txt"];
  expect(await detectSite(ref, [])).toBeNull();
});
it("mounts only the bounded selected subtree and reads immutable bytes lazily", async () => {
  const controller = new AbortController();
  const site = await prepareSite(
    { ref: { ...ref, path: "docs" }, entry: "index.html", server: false },
    controller.signal,
  );
  expect(bytesRead).toBe(0);
  expect(site.files.map((file) => file.path)).toEqual(files);
  await expect(site.read("../secret", controller.signal)).rejects.toThrow(
    "PERMISSION",
  );
  await site.read("data.json", controller.signal);
  expect(bytesRead).toBe(1);
  files = Array.from({ length: 501 }, (_, i) => i + ".html");
  await expect(
    prepareSite(
      { ref: { ...ref, path: "docs" }, entry: "index.html", server: false },
      controller.signal,
    ),
  ).rejects.toThrow("siteLimit");
});
it("offers Pages only after a successful API response and encodes hand-offs", async () => {
  expect(await pagesUrl(ref)).toBeUndefined();
  pages = true;
  expect(await pagesUrl(ref)).toBe("https://ada.github.io/site/");
  const links = handoffLinks(ref);
  expect(links.siteStackBlitz).toContain("/tree/feature%2Fread");
  expect(links.siteCodespaces).toContain("/tree/feature%2Fread");
  expect(links.siteCodeSandbox).toBe("https://codesandbox.io/s/new");
});
it("downloads media with real progress, reuses a version cache, and refuses over 100 MiB", async () => {
  rootFiles = ["lecture.mp4"];
  const progress = vi.fn();
  expect(
    (await readMedia({ ...ref, path: "lecture.mp4" }, undefined, progress))
      .size,
  ).toBe(4);
  expect(progress).toHaveBeenLastCalledWith({
    loaded: 4,
    total: 4,
    cached: true,
    cacheUnavailable: false,
  });
  vi.mocked(getMedia).mockResolvedValue(new Blob([new Uint8Array(4)]));
  await readMedia({ ...ref, path: "lecture.mp4" });
  expect(bytesRead).toBe(1);
  mediaSize = MEDIA_CAP + 1;
  await expect(readMedia({ ...ref, path: "lecture.mp4" })).rejects.toThrow(
    "mediaLimit",
  );
  expect(bytesRead).toBe(1);
});
it("has complete English and Hindi preview copy without banned punctuation", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
  expect(JSON.stringify({ en, hi })).not.toContain(String.fromCharCode(8212));
});
