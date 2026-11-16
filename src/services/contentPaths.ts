import { parseRef, type GitRef } from "../lib/refs";
export function resolveRelative(fileRef: string, href: string): GitRef {
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("#")
  )
    throw new Error("EXTERNAL_CONTENT");
  const ref = parseRef(fileRef);
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  const segments = path.startsWith("/") ? [] : ref.path.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!segments.length) throw new Error("INVALID_PATH");
      segments.pop();
    } else {
      if (part.includes("\0")) throw new Error("INVALID_PATH");
      segments.push(part);
    }
  }
  return { ...ref, path: segments.join("/") };
}
