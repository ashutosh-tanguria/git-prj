import { describe, expect, it } from "vitest";
import {
  MAX_BYTES,
  mime,
  siteCsp,
  validChannel,
  validManifest,
  validPath,
} from "../sandbox/protocol";
import { sandboxOrigin } from "../src/services/siteSession";
describe("virtual site boundary", () => {
  it("rejects traversal, ambiguous paths, duplicate entries and cap violations", () => {
    for (const path of [
      "../secret",
      "/assets/a.js",
      "a//b",
      "a/%2e",
      "a\\b",
      "a?b",
      "a\0b",
      "./x",
    ])
      expect(validPath(path), path).toBe(false);
    expect(validManifest([{ path: "index.html", size: MAX_BYTES }])).toBe(true);
    expect(validManifest([{ path: "index.html", size: MAX_BYTES + 1 }])).toBe(
      false,
    );
    expect(
      validManifest([
        { path: "a", size: 1 },
        { path: "a", size: 1 },
      ]),
    ).toBe(false);
    expect(
      validManifest(
        Array.from({ length: 501 }, (_, i) => ({ path: String(i), size: 0 })),
      ),
    ).toBe(false);
    expect(validManifest([{ path: "a", size: 0, token: "forbidden" }])).toBe(
      false,
    );
    expect(validManifest([{ path: "a", size: -1 }])).toBe(false);
    expect(validChannel("a".repeat(64))).toBe(true);
    expect(validChannel("guess")).toBe(false);
  });
  it("uses executable MIME types and restrictive policy", () => {
    expect(mime("module.mjs")).toContain("text/javascript");
    expect(mime("route.html")).toContain("text/html");
    expect(mime("file.woff2")).toBe("font/woff2");
    const policy = siteCsp(true, "https://preview.example.net");
    expect(policy).toContain("sandbox allow-scripts");
    for (const permission of [
      "allow-popups",
      "allow-top-navigation",
      "https:;",
    ])
      expect(policy).not.toContain(permission);
    expect(policy).toContain("worker-src 'none'");
  });
  it("refuses app-origin and same-site deployments", () => {
    expect(() =>
      sandboxOrigin("https://app.example.com", "https://app.example.com"),
    ).toThrow();
    expect(() =>
      sandboxOrigin("https://preview.example.com", "https://app.example.com"),
    ).toThrow();
    expect(() =>
      sandboxOrigin("http://127.0.0.1:5174", "https://app.example.com"),
    ).toThrow();
    expect(
      sandboxOrigin("https://preview.example.net", "https://app.example.com"),
    ).toBe("https://preview.example.net");
  });
});
