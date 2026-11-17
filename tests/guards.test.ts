import { describe, expect, it } from "vitest";
import en from "../src/i18n/en/common.json";
import hi from "../src/i18n/hi/common.json";
import { GITHUB, MiB } from "../src/lib/limits";
import {
  evaluateFile,
  evaluateRepo,
  evaluateBatch,
  evaluateVisibility,
  evaluateName,
  isLfsPointer,
} from "../src/services/guards";

describe("file limits", () => {
  it("only offers PDF splitting for PDFs", () => {
    expect(evaluateFile(150 * MiB).actions).not.toContain("splitPdf");
    expect(evaluateFile(150 * MiB, true).actions).toContain("splitPdf");
  });
  it.each([
    [24.9, "ok"],
    [25, "info"],
    [49.9, "info"],
    [50, "warn"],
    [94.9, "warn"],
    [95, "block"],
    [100, "block"],
  ] as const)("%s MiB is %s", (size, level) =>
    expect(evaluateFile(Math.floor(size * MiB)).level).toBe(level),
  );
  for (const [threshold, level] of [
    [GITHUB.FILE_INFO_AT, "info"],
    [GITHUB.FILE_WARN_AT, "warn"],
    [GITHUB.FILE_BLOCK_AT, "block"],
  ] as const)
    it(`switches at byte ${threshold}`, () => {
      expect(evaluateFile(threshold).level).toBe(level);
      expect(evaluateFile(threshold - 1).level).not.toBe(level);
    });
});
describe("repository projection", () => {
  it.each([
    [499, "ok"],
    [500, "info"],
    [1023, "info"],
    [1024, "warn"],
    [4999, "warn"],
    [5120, "block"],
  ] as const)("%s MiB is %s", (size, level) =>
    expect(evaluateRepo(size * 1024).level).toBe(level),
  );
  it("includes additions conservatively and blocks unknown size", () => {
    expect(evaluateRepo(499 * 1024, MiB - 1).level).toBe("ok");
    expect(evaluateRepo(499 * 1024, MiB).level).toBe("info");
    expect(evaluateRepo(null).level).toBe("block");
    expect(evaluateRepo(5120 * 1024).actions).toContain(
      "overrideWithExplanation",
    );
  });
  for (const kb of [
    GITHUB.REPO_AMBER_KB,
    GITHUB.REPO_RED_KB,
    GITHUB.REPO_BLOCK_KB,
  ])
    it(`switches immediately at ${kb} KB`, () =>
      expect(evaluateRepo(kb - 1, 1023).level).not.toBe(
        evaluateRepo(kb).level,
      ));
});
it("splits ordered changes only above the cap and rejects unsplittable items", () => {
  expect(evaluateBatch([250 * MiB, 250 * MiB]).batches).toHaveLength(1);
  expect(evaluateBatch([250 * MiB, 250 * MiB, 1]).batches).toEqual([
    [250 * MiB, 250 * MiB],
    [1],
  ]);
  expect(evaluateBatch([GITHUB.BATCH_CAP + 1]).level).toBe("block");
  expect(evaluateBatch([]).batches).toEqual([]);
});
it("requires a fresh public confirmation and blocks unknown visibility", () => {
  expect(evaluateVisibility("public").level).toBe("block");
  expect(evaluateVisibility("public", true).level).toBe("ok");
  expect(evaluateVisibility("public").level).toBe("block");
  expect(evaluateVisibility("private").level).toBe("ok");
  expect(evaluateVisibility("unknown", true).level).toBe("block");
});
it.each([
  "AADHAAR.pdf",
  "aadhar.pdf",
  "passport.png",
  "PAN card.pdf",
  "marksheet.pdf",
  "PASSWORD.txt",
  "secret.txt",
  "folder/.env.local",
  "id_rsa",
  "cert.PEM",
  "private.key",
  "credentials.json",
])("warns on sensitive name %s", (name) => {
  const v = evaluateName(name, "public");
  expect(v.level).toBe("warn");
  expect(v.actions).toContain("confirmSensitive");
  expect(v.params.match).toBeTruthy();
  expect(evaluateName(name, "private").actions).toEqual([]);
});
it.each([
  "lecture.pdf",
  "environment.txt",
  "monkey.txt",
  "folder/.environment",
  "pem.txt",
])("does not warn on %s", (name) =>
  expect(evaluateName(name, "private").level).toBe("ok"),
);
it("recognizes only the exact first LFS pointer line", () => {
  const line = "version https://git-lfs.github.com/spec/v1";
  expect(isLfsPointer(line + "\r\noid sha256:abc")).toBe(true);
  expect(isLfsPointer("\n" + line)).toBe(false);
  expect(isLfsPointer(line + "x")).toBe(false);
});
it("fails closed on invalid sizes", () => {
  for (const n of [-1, NaN, Infinity, 1.2]) {
    expect(() => evaluateFile(n)).toThrow();
    expect(() => evaluateRepo(0, n)).toThrow();
    expect(() => evaluateBatch([n])).toThrow();
  }
});
it("has both translations for every verdict", () => {
  const values = [
    evaluateFile(0),
    evaluateFile(25 * MiB),
    evaluateFile(50 * MiB),
    evaluateFile(95 * MiB),
    ...[0, 500, 1024, 5120].map((n) => evaluateRepo(n * 1024)),
    evaluateRepo(null),
    evaluateBatch([]),
    evaluateBatch([500 * MiB, 1]),
    evaluateBatch([500 * MiB + 1]),
    evaluateVisibility("unknown"),
    evaluateVisibility("public"),
    evaluateVisibility("public", true),
    evaluateVisibility("private"),
    evaluateName("notes.txt", "private"),
    evaluateName("secret.txt", "public"),
  ];
  for (const { code } of values) {
    expect(en).toHaveProperty(code);
    expect(hi).toHaveProperty(code);
  }
});
