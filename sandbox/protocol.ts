export const MAX_FILES = 500;
export const MAX_BYTES = 50 * 1024 * 1024;
export interface VirtualFile {
  path: string;
  size: number;
}
export const validChannel = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function validPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length < 4096 &&
    !value.startsWith("/") &&
    !/[\\\u0000-\u001f?#%]/.test(value) &&
    value
      .split("/")
      .every((part) => part !== ".." && part !== "." && part !== "")
  );
}
export function validManifest(value: unknown): value is VirtualFile[] {
  if (!Array.isArray(value) || value.length > MAX_FILES || !value.length)
    return false;
  const seen = new Set<string>();
  let total = 0;
  return value.every((file: VirtualFile) => {
    if (
      !file ||
      Object.keys(file).sort().join() !== "path,size" ||
      !validPath(file.path) ||
      seen.has(file.path) ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0
    )
      return false;
    seen.add(file.path);
    total += file.size;
    return total <= MAX_BYTES;
  });
}
export function mime(path: string): string {
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    json: "application/json",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    wasm: "application/wasm",
    txt: "text/plain; charset=utf-8",
    xml: "application/xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    webmanifest: "application/manifest+json",
    map: "application/json",
  };
  return (
    types[path.split(".").at(-1)?.toLowerCase() || ""] ||
    "application/octet-stream"
  );
}
export function siteCsp(blocked: boolean, origin: string): string {
  const sources = origin + (blocked ? "" : " https:");
  // The repository replaces the bootstrap. Its parent is cross-origin Shelf.
  return `default-src 'none'; script-src ${sources} 'unsafe-inline'; style-src ${sources} 'unsafe-inline'; img-src ${sources} data: blob:; font-src ${sources}; media-src ${sources} blob:; connect-src ${sources}; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin`;
}
