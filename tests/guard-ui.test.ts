// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import "../src/i18n";
import { GuardReview } from "../src/components/GuardReview";
const repo = {
  full_name: "ada/sample",
  private: false,
  default_branch: "main",
  size: 0,
};
afterEach(cleanup);
it("does not approve public and sensitive files before explicit confirmations", () => {
  render(
    createElement(GuardReview, {
      repo,
      files: [{ name: "passport.pdf", size: 1000 }],
    }),
  );
  expect(screen.queryByRole("status")).toBeNull();
  for (const checkbox of screen.getAllByRole("checkbox"))
    fireEvent.click(checkbox);
  expect(screen.getByRole("status").textContent).toContain("Checks passed");
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
});
it("cannot approve a 150 MiB file by confirming warnings", () => {
  render(
    createElement(GuardReview, {
      repo,
      files: [{ name: "sample.pdf", size: 150 * 1048576 }],
    }),
  );
  for (const checkbox of screen.getAllByRole("checkbox"))
    fireEvent.click(checkbox);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("This file is too large for GitHub")).toBeTruthy();
});
