import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { auditPreviewMessages } from "./previewAudit";
const files: Record<string, string> = {
  "index.html": readFileSync("fixtures/hostile-site/index.html", "utf8"),
  "attacks.js": readFileSync("fixtures/hostile-site/attacks.js", "utf8"),
};
test("sandbox rejects initialization from an unapproved parent origin", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/");
  await page.evaluate(async () => {
    const frame = document.createElement("iframe");
    frame.title = "Wrong parent";
    frame.src = "/";
    document.body.append(frame);
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
    });
    const bridge = new MessageChannel();
    frame.contentWindow?.postMessage(
      {
        type: "init",
        channel: "a".repeat(64),
        entry: "index.html",
        blocked: true,
        files: [{ path: "index.html", size: 4 }],
      },
      location.origin,
      [bridge.port2],
    );
  });
  // frame-ancestors rejects B as a parent before the protocol can be initialized.
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  await expect(page.locator("iframe")).toHaveCount(1);
  expect(page.frames().some((frame) => frame.url().includes("/vfs/"))).toBe(
    false,
  );
});
test("hostile site fails every escape and every message excludes app secrets", async ({
  page,
  context,
}) => {
  const network: string[] = [];
  const traffic = await auditPreviewMessages(context);
  context.on("request", (request) => network.push(request.url()));
  await page.goto("/");
  await page.evaluate(async (source) => {
    localStorage.setItem("shelf-private", "PRIVATE_STORAGE_SENTINEL");
    document.cookie = "shelf-private=PRIVATE_COOKIE_SENTINEL; SameSite=Strict";
    // Fake credential in app memory only, never in the preview protocol.
    const credential = "TOKEN_SENTINEL_12345";
    if (!credential) throw Error("fixture");
    const banner = document.createElement("p");
    banner.dataset.untrustedBanner = "true";
    banner.textContent =
      "Untrusted preview from fixture/hostile. It runs in isolation and cannot see your files or tokens.";
    const frame = document.createElement("iframe");
    frame.title = "Isolated preview";
    frame.sandbox.add("allow-scripts", "allow-same-origin");
    const channel = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    const bridge = new MessageChannel();
    bridge.port1.onmessage = ({ data }) => {
      if (
        data.channel !== channel ||
        data.type !== "need" ||
        !(data.path in source)
      )
        return;
      const bytes = new TextEncoder().encode(source[data.path]).buffer;
      bridge.port1.postMessage(
        { type: "file", channel, path: data.path, bytes },
        [bytes],
      );
    };
    addEventListener("message", function ready(event) {
      if (
        event.source !== frame.contentWindow ||
        event.origin !== "http://127.0.0.1:4174" ||
        event.data?.type !== "sandbox-ready"
      )
        return;
      removeEventListener("message", ready);
      frame.contentWindow?.postMessage(
        {
          type: "init",
          channel,
          entry: "index.html",
          blocked: true,
          files: Object.entries(source).map(([path, text]) => ({
            path,
            size: new TextEncoder().encode(text).byteLength,
          })),
        },
        "http://127.0.0.1:4174",
        [bridge.port2],
      );
    });
    document.body.replaceChildren(banner, frame);
    frame.src = "http://127.0.0.1:4174/";
  }, files);
  const inner = page.frameLocator('iframe[title="Isolated preview"]');
  await inner.getByRole("button", { name: "Try escapes" }).click();
  const expected = Object.fromEntries(
    [
      "parent",
      "storage",
      "cookies",
      "top",
      "banner",
      "popup",
      "worker",
      "fetch",
    ].map((name) => [name, "blocked"]),
  );
  await expect(inner.locator("#results")).toHaveText(JSON.stringify(expected));
  await expect(page.locator("[data-untrusted-banner]")).toBeVisible();
  expect(page.url()).toBe("http://127.0.0.1:4173/");
  expect(context.pages()).toHaveLength(1);
  expect(network.some((url) => /exfiltrate|escape|popup/.test(url))).toBe(
    false,
  );
  expect(traffic, "Observed all window and port messages").toEqual(
    expect.arrayContaining([expect.stringContaining('"type":"init"')]),
  );
  expect(traffic.some((value) => value.includes('"type":"file"'))).toBe(true);
  const serialized = traffic.join("\n") + network.join("\n");
  for (const secret of [
    "PRIVATE_STORAGE_SENTINEL",
    "PRIVATE_COOKIE_SENTINEL",
    "TOKEN_SENTINEL_12345",
  ])
    expect(serialized).not.toContain(secret);
});
