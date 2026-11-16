import { expect, it } from "vitest";
import { selectionClick, selectRange } from "../src/services/selection";
it("supports replacement, toggle, forward and reverse ranges", () => {
  expect(selectionClick([1], 3, 1, 10)).toEqual([3]);
  expect(selectionClick([1, 3], 3, 1, 10, true)).toEqual([1]);
  expect(selectionClick([1], 3, 1, 10, true)).toEqual([1, 3]);
  expect(selectionClick([1], 4, 1, 10, false, true)).toEqual([1, 2, 3, 4]);
  expect(selectRange(10, 5, 2)).toEqual([2, 3, 4, 5]);
  expect(selectRange(0, 0, 0)).toEqual([]);
});
