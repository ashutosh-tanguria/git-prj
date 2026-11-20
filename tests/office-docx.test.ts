// @vitest-environment jsdom
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderAsync } from "docx-preview";
import DOMPurify from "dompurify";

it("renders the DOCX fixture's text, table and embedded image", async () => {
  const root = document.createElement("div");
  await renderAsync(new Uint8Array(readFileSync("fixtures/office-reading.docx")), root, undefined, { useBase64URL: true, renderAltChunks: false });
  DOMPurify.sanitize(root, { IN_PLACE: true, ADD_TAGS: ["style"] });
  expect(root.textContent).toContain("Office reading note");
  expect(root.querySelector("td")?.textContent).toBe("Table cell");
  expect(root.querySelector("img")?.src).toMatch(/^data:image\/png;base64,/);
});
