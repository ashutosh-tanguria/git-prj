import { expect, it } from "vitest";
import "../src/i18n";
import { en, hi } from "../src/i18n/working";
it("keeps working-copy messages in both languages", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
  expect(JSON.stringify({ en, hi })).not.toContain(String.fromCharCode(8212));
});
