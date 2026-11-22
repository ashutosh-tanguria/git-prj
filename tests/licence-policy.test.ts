// @ts-expect-error The CLI policy is a plain Node ESM module.
import { approvesLicence } from "../scripts/licence-policy.mjs";
import { expect, it } from "vitest";

it.each([
  ["(MIT OR GPL-3.0-or-later)", true],
  ["GPL-3.0-or-later OR (MIT AND Zlib)", true],
  ["MIT AND (GPL-3.0-or-later OR AGPL-3.0-only)", false],
  ["MIT OR GPL-3.0-only AND BSD-3-Clause", true],
  ["MIT OR", false],
  ["MIT OR (GPL-3.0-only", false],
])("evaluates the locked SPDX expression %s", (expression, approved) => {
  expect(approvesLicence(expression)).toBe(approved);
});
