import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import stylelint from "stylelint";
import { ESLint } from "eslint";
import en from "../src/i18n/en/common.json";
import hi from "../src/i18n/hi/common.json";
const css = readFileSync("src/styles/tokens.css", "utf8");
const blocks = [
  ...css.matchAll(
    /(?:^:root \{|^:root\[data-theme="dark"\] \{)([\s\S]*?)^\}/gm,
  ),
].slice(0, 2);
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function ratio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("semantic contrast registry", () => {
  it("contains light and dark palettes", () => expect(blocks).toHaveLength(2));
  blocks.forEach((block, index) => {
    const tokens = Object.fromEntries(
      [...block[1].matchAll(/--([\w-]+):\s*(#[\da-fA-F]{6})/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    const papers = ["paper-0", "paper-1", "paper-2"];
    const pairs: [string, string, number][] = [];
    for (const fg of [
      "ink-1",
      "ink-2",
      "ink-3",
      "accent",
      "ok",
      "warn",
      "danger",
    ])
      for (const bg of papers) pairs.push([fg, bg, 4.5]);
    for (const bg of papers)
      for (const fg of [
        "rule-strong",
        "provider-github",
        "provider-gdrive",
        "provider-dropbox",
        "provider-onedrive",
        "provider-local",
      ])
        pairs.push([fg, bg, 3]);
    for (const fg of ["ink-1", "ink-2", "ink-3", "accent"])
      pairs.push([fg, "accent-tint", 4.5]);
    for (const status of ["ok", "warn", "danger"])
      pairs.push([status, status + "-tint", 4.5]);
    pairs.push(["accent-ink", "accent", 4.5], ["ink-2", "paper-0", 4.5]);
    for (const [fg, bg, minimum] of pairs)
      it(index + " " + fg + "/" + bg, () =>
        expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(minimum),
      );
  });
});
it("rejects banned patterns including conic gradients and alternate color functions", async () => {
  for (const declaration of [
    "color:#fff",
    "color:rgb(0 0 0)",
    "color:oklch(50% 0 0)",
    "background:linear-gradient(red,blue)",
    "background:conic-gradient(red,blue)",
    "backdrop-filter:blur(2px)",
    "box-shadow:0 0 2px red",
    "text-shadow:0 0 2px red",
    "filter:drop-shadow(0 0 2px red)",
    "color:red",
  ]) {
    const result = await stylelint.lint({
      code: ".bad{" + declaration + "}",
      codeFilename: "src/ui/Bad.module.css",
      configFile: "stylelint.config.js",
    });
    expect(result.errored, declaration).toBe(true);
  }
});
it("accepts token references and the single elevation", async () => {
  expect(
    (
      await stylelint.lint({
        code: ".good {color:var(--ink-1);box-shadow:var(--elevation)}",
        codeFilename: "src/ui/Good.module.css",
        configFile: "stylelint.config.js",
      })
    ).errored,
  ).toBe(false);
});
it("runs jsx-a11y rules on supported ESLint 10 override", async () => {
  const lint = new ESLint();
  const [bad] = await lint.lintText("export const Bad = () => <img />;", {
    filePath: "src/probe.tsx",
  });
  expect(bad.messages.some((m) => m.ruleId === "jsx-a11y/alt-text")).toBe(true);
  const [good] = await lint.lintText(
    'export const Good = () => <img alt="Lecture notes" />;',
    { filePath: "src/probe.tsx" },
  );
  expect(good.errorCount).toBe(0);
});
function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, v]) =>
    typeof v === "object" ? keys(v, prefix + key + ".") : [prefix + key],
  );
}
it("keeps Hindi and English keys in parity with no banned punctuation", () => {
  expect(keys(en).sort()).toEqual(keys(hi).sort());
  expect(JSON.stringify({ en, hi })).not.toContain(String.fromCharCode(8212));
});
