import { expect, it } from "vitest";
import { fileFamily } from "../src/lib/fileFamily";
it("assigns semantic tag families case-insensitively with a neutral fallback", () => {
  for (const [ext, family] of [
    ["PDF", "pdf"],
    ["docx", "doc"],
    ["CSV", "sheet"],
    ["pptx", "slide"],
    ["svg", "image"],
    ["mp4", "video"],
    ["wav", "audio"],
    ["ts", "code"],
    ["zip", "archive"],
    ["unknown", "text"],
  ])
    expect(fileFamily(ext)).toBe(family);
});
