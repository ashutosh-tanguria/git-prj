import { expect, it } from "vitest";
import { relativeTime } from "../src/lib/time";
it("formats known dates and preserves invalid metadata honestly", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  expect(relativeTime("2026-11-14T12:00:00Z", now)).toContain("2");
  expect(relativeTime("invalid", now)).toBe("invalid");
});
