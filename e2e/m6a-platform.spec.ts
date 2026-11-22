import { expect, test } from "@playwright/test";
import { auditPreviewMessages } from "./previewAudit";
import { appRequestAllowed } from "../src/services/networkAllowlist";

const app = "http://127.0.0.1:4173";
const sandbox = "http://127.0.0.1:4174";
const worker = "https://shelf-oauth.example";
const repo = {
  full_name: "ada/shelf-demo",
  default_branch: "main",
  private: true,
  size: 64,
};
const branch = "/#/gh/ada/shelf-demo@main/";
const site =
  '<!doctype html><html lang="en"><title>Shelf demo</title><h1>Local sample site</h1>';
const code = "ONE_USE_OAUTH_CODE";
const firstAccess = "ghu_M6A_PRIVATE_ACCESS";
const firstRefresh = "ghr_M6A_PRIVATE_REFRESH";
const access = "ghu_M6A_ROTATED_ACCESS";
const refresh = "ghr_M6A_ROTATED_REFRESH";

test("OAuth, cached library, and isolated preview enforce the network allowlist", async ({
  page,
  context,
}) => {
  const origins = new Set<string>();
  const denied: string[] = [];
  const workerPaths: string[] = [];
  let offline = false;
  const traffic = await auditPreviewMessages(context);
  const log: string[] = [];
  page.on("console", (message) => log.push(message.text()));
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return;
    origins.add(url.origin);
    if (!appRequestAllowed(url, [app, sandbox, worker]))
      denied.push(url.origin + url.pathname);
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if ([app, sandbox].includes(url.origin)) return route.continue();
    if (
      url.origin === "https://github.com" &&
      url.pathname === "/login/oauth/authorize"
    ) {
      expect(url.searchParams.get("redirect_uri")).toBe(app + "/auth/github/");
      expect(url.searchParams.get("state")).toMatch(/^[a-f0-9]{64}$/);
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      const callback = new URL("/auth/github/", app);
      callback.search = new URLSearchParams({
        state: url.searchParams.get("state")!,
        code,
      }).toString();
      return route.fulfill({
        status: 302,
        headers: { location: callback.href },
      });
    }
    if (url.origin === worker) {
      const headers = {
        "access-control-allow-origin": app,
        "access-control-allow-methods": "POST",
        "access-control-allow-headers": "content-type",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      expect(request.method()).toBe("POST");
      expect(request.headers().authorization).toBeUndefined();
      const input = request.postDataJSON();
      workerPaths.push(url.pathname);
      if (url.pathname === "/github/token") {
        expect(input).toEqual({
          code,
          redirect_uri: app + "/auth/github/",
          code_verifier: expect.stringMatching(/^[a-f0-9]{64}$/),
        });
      } else if (url.pathname === "/github/refresh") {
        expect(input).toEqual({ refresh_token: firstRefresh });
      } else if (url.pathname === "/github/revoke") {
        expect(input).toEqual({ access_token: access });
        return route.fulfill({ status: 204, headers });
      } else {
        denied.push(url.origin + url.pathname);
        return route.abort();
      }
      return route.fulfill({
        headers,
        json: {
          access_token: url.pathname === "/github/token" ? firstAccess : access,
          refresh_token:
            url.pathname === "/github/token" ? firstRefresh : refresh,
          expires_in: 28800,
          refresh_token_expires_in: 60000,
        },
      });
    }
    if (url.origin === "https://api.github.com") {
      if (offline) return route.abort("internetdisconnected");
      if (request.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": app,
            "access-control-allow-headers": "authorization,content-type",
          },
        });
      expect(request.headers().authorization).toMatch(/^Bearer ghu_M6A_/);
      const path = url.pathname;
      if (path === "/user") return route.fulfill({ json: { login: "ada" } });
      if (path === "/user/installations")
        return route.fulfill({ json: { installations: [{ id: 42 }] } });
      if (path === "/user/installations/42/repositories")
        return route.fulfill({ json: { repositories: [repo] } });
      if (path.endsWith("/git/ref/heads/main"))
        return route.fulfill({ json: { object: { sha: "head" } } });
      if (path.endsWith("/git/commits/head"))
        return route.fulfill({ json: { tree: { sha: "tree" } } });
      if (path.includes("/git/trees/"))
        return route.fulfill({
          json: {
            tree: [
              {
                path: "index.html",
                mode: "100644",
                type: "blob",
                sha: "index",
                size: site.length,
              },
            ],
            truncated: false,
          },
        });
      if (path.endsWith("/git/blobs/index"))
        return route.fulfill({
          body: site,
          contentType: "application/octet-stream",
        });
      if (path.endsWith("/commits")) return route.fulfill({ json: [] });
      if (path === "/repos/ada/shelf-demo")
        return route.fulfill({ json: repo });
      return route.fulfill({ status: 404, json: {} });
    }
    denied.push(url.origin + url.pathname);
    return route.abort();
  });

  const response = await page.goto(branch);
  expect(response?.headers()["content-security-policy"]).toContain(worker);
  expect(response?.headers()["content-security-policy"]).toMatch(
    /frame-src[^;]*127\.0\.0\.1:4174/,
  );
  expect(response?.headers()["content-security-policy"]).not.toMatch(
    /connect-src[^;]*127\.0\.0\.1:4174/,
  );
  const authorize = page.getByRole("button", { name: "Sign in with GitHub" });
  await expect(
    page.getByRole("link", { name: "Install on more repositories" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/apps/shelf-test/installations/new",
  );
  await authorize.click();
  await expect(page.getByRole("grid")).toBeVisible();
  expect(page.url()).toBe(app + branch);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page
    .getByRole("navigation", { name: "Library commands" })
    .getByRole("button", { name: "Preview site", exact: true })
    .click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="Website preview"]')
      .getByRole("heading", { name: "Local sample site" }),
  ).toBeVisible();
  expect(traffic.some((value) => value.includes('"type":"init"'))).toBe(true);
  expect(traffic.some((value) => value.includes('"type":"file"'))).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Remember on this device" }).click();
  await page.getByLabel("Device passphrase").fill("fixture device passphrase");
  await page
    .locator("form")
    .filter({ has: page.getByLabel("Device passphrase") })
    .getByRole("button", { name: "Remember on this device" })
    .click();
  await expect(
    page.getByRole("button", { name: "Forget this device" }),
  ).toBeVisible();
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("shelf-github-oauth");
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
    return new Promise<string>((resolve, reject) => {
      const request = db
        .transaction("vault")
        .objectStore("vault")
        .get("refresh");
      request.onsuccess = () => {
        db.close();
        const data = request.result;
        resolve(
          JSON.stringify({
            ...data,
            encrypted: new TextDecoder().decode(data.encrypted),
            storage: [
              document.cookie,
              JSON.stringify(localStorage),
              JSON.stringify(sessionStorage),
            ],
            url: location.href,
          }),
        );
      };
      request.onerror = reject;
    });
  });
  expect(saved).toContain('"minutes":30');
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page).toHaveURL(app + branch);
  offline = true;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("grid")).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  offline = false;
  const unlock = page.getByRole("main").getByRole("button", {
    name: "Unlock saved GitHub sign-in",
  });
  await unlock.click();
  await page.getByLabel("Device passphrase").fill("fixture device passphrase");
  await page
    .locator("form")
    .filter({ has: page.getByLabel("Device passphrase") })
    .getByRole("button", { name: "Unlock saved GitHub sign-in" })
    .click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect
    .poll(() => workerPaths)
    .toEqual(["/github/token", "/github/refresh", "/github/revoke"]);
  await expect(authorize).toBeVisible();
  expect(denied).toEqual([]);
  expect(origins).toEqual(
    new Set([
      app,
      sandbox,
      worker,
      "https://github.com",
      "https://api.github.com",
    ]),
  );
  const published = [saved, ...traffic, ...log].join("\n");
  for (const secret of [
    code,
    access,
    refresh,
    firstAccess,
    firstRefresh,
    "fixture device passphrase",
  ]) {
    expect(published).not.toContain(secret);
  }
});

test("static callback clears rejected OAuth state without exchanging a code", async ({
  page,
  context,
}) => {
  const reachedWorker: string[] = [];
  await context.route(worker + "/**", (route) => {
    reachedWorker.push(route.request().url());
    return route.abort();
  });
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "shelf-github-oauth",
      JSON.stringify({
        state: "real-state",
        verifier: "verifier",
        route: "",
        started: Date.now(),
      }),
    ),
  );
  await page.goto("/auth/github/?code=" + code + "&state=wrong");
  await expect(page.getByRole("alert")).toHaveText(
    "GitHub sign-in did not finish. Try again.",
  );
  expect(page.url()).toBe(app + "/");
  expect(reachedWorker).toEqual([]);
  expect(
    await page.evaluate(() => sessionStorage.getItem("shelf-github-oauth")),
  ).toBe(null);
});
