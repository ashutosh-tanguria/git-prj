import { expect, it } from "vitest";
import {
  buildTextIndex,
  findText,
  normalizeText,
} from "../src/services/textSearch";

it("fits an exact phrase to the right page and returns plain snippet text", () => {
  const pages = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    text:
      index === 11
        ? normalizeText("Before: tidal\n  archive signal, after")
        : "archive without a signal",
  }));
  const results = findText(
    pages,
    buildTextIndex(pages),
    '"Tidal archive signal"',
  );
  expect(results).toEqual([
    {
      page: 12,
      before: "Before: ",
      match: "tidal archive signal",
      after: ", after",
      score: expect.any(Number),
    },
  ]);
});
