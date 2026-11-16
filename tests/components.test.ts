// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { AddressBar } from "../src/components/AddressBar";
import { QuickLook } from "../src/components/QuickLook";
import { sanitizedMarkdown } from "../src/viewers/SafeMarkup";
afterEach(cleanup);
it("submits an edited address", () => {
  let address = "";
  const view = render(
    createElement(AddressBar, {
      value: "gh:ada/notes@main/",
      onGo: (value) => {
        address = value;
      },
    }),
  );
  fireEvent.change(view.getByLabelText("Address"), {
    target: { value: "gh:ada/books@main/" },
  });
  fireEvent.submit(view.getByRole("button", { name: "Go" }).closest("form")!);
  expect(address).toBe("gh:ada/books@main/");
});
it("opens a named Quick Look dialog and closes explicitly", () => {
  let closed = false;
  const view = render(
    createElement(QuickLook, {
      title: "notes.pdf",
      onClose: () => {
        closed = true;
      },
      children: "Sample preview",
    }),
  );
  expect(view.getByRole("dialog")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  expect(closed).toBe(true);
});
it("sanitizes scripts, events, frames and external image loading", () => {
  const html = sanitizedMarkdown(
    '<script>alert(1)</script><img src="https://evil.invalid" onerror="alert(1)"><iframe></iframe>',
  );
  expect(html).not.toMatch(/script|img|iframe|onerror/i);
});
