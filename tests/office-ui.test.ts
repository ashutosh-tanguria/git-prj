// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OfficeToolbar } from "../src/viewers/OfficeToolbar";
import Office from "../src/viewers/Office";
import en from "../src/i18n/en/office.json";
import hi from "../src/i18n/hi/office.json";

afterEach(cleanup);
it("Office locale keys match and legacy/over-limit documents never start a frame", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
  const legacy = render(
    createElement(Office, { blob: new Blob(["legacy"]), name: "lecture.ppt" }),
  );
  expect(legacy.getByRole("status").textContent).toBe(en.officeUnsupported);
  expect(legacy.container.querySelector("iframe")).toBeNull();
  legacy.unmount();
  const large = render(
    createElement(Office, {
      blob: new Blob([new Uint8Array(50 * 1024 * 1024 + 1)]),
      name: "large.docx",
    }),
  );
  expect(large.getByRole("status").textContent).toBe(en.officelimit);
  expect(large.container.querySelector("iframe")).toBeNull();
});
it("sheet tabs support arrows and End while cloud rendering remains unavailable", () => {
  const onSheet = vi.fn();
  const view = render(
    createElement(OfficeToolbar, {
      zoom: 100,
      page: 1,
      pages: 1,
      slides: false,
      sheets: [
        { name: "Summary", truncated: false },
        { name: "Notes", truncated: false },
      ],
      sheet: 0,
      ready: true,
      onZoom: vi.fn(),
      onPage: vi.fn(),
      onSheet,
    }),
  );
  fireEvent.keyDown(view.getByRole("tab", { name: "Summary" }), { key: "End" });
  expect(onSheet).toHaveBeenCalledWith(1);
  expect(document.activeElement?.textContent).toBe("Notes");
  expect(
    view
      .getByRole("button", { name: en.officeCloud })
      .getAttribute("aria-disabled"),
  ).toBe("true");
});
