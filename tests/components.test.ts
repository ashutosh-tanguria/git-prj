// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { AddressBar } from "../src/components/AddressBar";
import { QuickLook } from "../src/components/QuickLook";
import { sanitizedMarkdown } from "../src/viewers/SafeMarkup";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
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
  fireEvent.click(view.getByRole("button", { name: "Address" }));
  fireEvent.change(view.getByLabelText("Address"), {
    target: { value: "gh:ada/books@main/" },
  });
  fireEvent.submit(view.getByLabelText("Address").closest("form")!);
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

import { highlightMatches } from "../src/viewers/highlight";
it("highlights phrases across PDF spans without creating active markup", () => {
  const node = document.createElement("div");
  const a = document.createElement("span"),
    b = document.createElement("span");
  a.textContent = "A needle";
  b.textContent = "phrase and needle phrase.";
  node.append(a, b);
  expect(highlightMatches(node, "needle phrase")).toBe(2);
  expect(node.querySelectorAll('mark[data-match="0"]')).toHaveLength(2);
  expect(node.querySelectorAll("script")).toHaveLength(0);
});

import { resolveRelative } from "../src/services/contentPaths";
it("resolves content paths only inside the same provider repository", () => {
  expect(
    resolveRelative(
      "gh:ada/notes@main/chapter/readme.md",
      "../images/diagram.svg",
    ).path,
  ).toBe("images/diagram.svg");
  expect(() =>
    resolveRelative(
      "gh:ada/notes@main/readme.md",
      "https://evil.invalid/x.png",
    ),
  ).toThrow();
  expect(() =>
    resolveRelative("gh:ada/notes@main/readme.md", "../outside"),
  ).toThrow();
});

import { Inspector } from "../src/components/Inspector";
import { FileTable } from "../src/components/FileTable";
it("shows exact multi-selection totals without fetching file previews", () => {
  const view = render(
    createElement(Inspector, {
      defaultTab: "details",
      visibility: "Private",
      entries: [
        {
          name: "chapter-one.md",
          path: "chapter-one.md",
          ref: "gh:ada/notes@main/chapter-one.md",
          size: 1200,
          sha: "one",
          kind: "file",
        },
        {
          name: "chapter-two.md",
          path: "chapter-two.md",
          ref: "gh:ada/notes@main/chapter-two.md",
          size: 2400,
          sha: "two",
          kind: "file",
        },
      ],
    }),
  );
  expect(view.getByRole("tabpanel").textContent).toContain("Selected files: 2");
  expect(view.getByRole("tabpanel").textContent).toContain("3,600");
  fireEvent.click(view.getByRole("tab", { name: "Preview" }));
  expect(view.getByRole("tabpanel").textContent).toContain("Select one file");
});
it("announces grid select-all and typeahead selection through the component", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0));
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const selection = vi.fn();
  const view = render(
    createElement(FileTable, {
      entries: [
        {
          name: "algorithms.md",
          path: "algorithms.md",
          ref: "gh:ada/notes@main/algorithms.md",
          size: 1024,
          sha: "one",
          kind: "file",
        },
        {
          name: "replication.md",
          path: "replication.md",
          ref: "gh:ada/notes@main/replication.md",
          size: 2048,
          sha: "two",
          kind: "file",
        },
      ],
      onOpen: () => {},
      onPreview: () => {},
      onSelectionChange: selection,
    }),
  );
  await waitFor(() => expect(selection).toHaveBeenCalled());
  fireEvent.keyDown(view.getByRole("grid"), { key: "a", ctrlKey: true });
  expect(view.getByRole("status").textContent).toContain("2");
  fireEvent.keyDown(view.getByRole("grid"), { key: "r" });
  expect(view.getByRole("status").textContent).toContain("1");
  expect(selection.mock.calls.at(-1)?.[0][0].name).toBe("replication.md");
});

import { delimited } from "../src/lib/delimited";
it("parses quoted CSV newlines and bounds previews while counting all rows", () => {
  expect(
    delimited(
      'name,note\r\n"Sample, chapter","line one\nline ""two"""\r\n',
      ",",
    ).rows,
  ).toEqual([
    ["name", "note"],
    ["Sample, chapter", 'line one\nline "two"'],
  ]);
  const data = delimited(
    Array.from({ length: 6001 }, (_, i) => "chapter-" + i + ",12").join("\n"),
    ",",
  );
  expect(data.rows).toHaveLength(5000);
  expect(data.total).toBe(6001);
});

import { htmlPreview } from "../src/services/htmlPolicy";
it("strips active HTML and every resource URL before sandbox creation", () => {
  const safe = htmlPreview(
    '<h1>Sample</h1><img src="https://evil.invalid/x"><a href="https://evil.invalid/y">Link</a><style>body{background:url(https://evil.invalid/z)}</style><script>fetch("https://evil.invalid")</script><meta http-equiv="refresh" content="0;url=https://evil.invalid"><iframe src="https://evil.invalid"></iframe>',
  );
  expect(safe).toContain("<h1>Sample</h1>");
  expect(safe).not.toMatch(/evil|src=|href=|script|iframe|style|meta/i);
});
