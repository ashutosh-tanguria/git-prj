import { expect, it } from "vitest";
import {
  defaultShortcuts,
  shortcutMatches,
  validShortcuts,
} from "../src/services/shortcuts";
it("matches defaults and canonical remappings without accepting extra modifiers", () => {
  for (const key of ["n", "m", "p"])
    expect(
      shortcutMatches(
        {
          key,
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
        } as KeyboardEvent,
        "Alt+" + key.toUpperCase(),
      ),
    ).toBe(true);
  expect(
    shortcutMatches(
      {
        key: "K",
        altKey: true,
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
      } as KeyboardEvent,
      "Shift+Alt+Control+k",
    ),
  ).toBe(true);
  expect(validShortcuts(defaultShortcuts)).toBe(true);
  expect(validShortcuts({ ...defaultShortcuts, push: "Alt+Alt+k" })).toBe(
    false,
  );
  expect(validShortcuts({ ...defaultShortcuts, push: "Control+p" })).toBe(
    false,
  );
  expect(
    validShortcuts({
      ...defaultShortcuts,
      push: "Shift+Alt+k",
      newRepository: "Alt+Shift+k",
    }),
  ).toBe(false);
});
