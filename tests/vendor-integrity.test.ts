import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("vendored spreadsheet parser", () => {
  it("matches the approved tarball SHA-256", () => {
    const digest = createHash("sha256")
      .update(readFileSync("vendor/xlsx-0.20.3.tgz"))
      .digest("hex");
    expect(digest.toLowerCase()).toBe(
      "8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8",
    );
  });
});
