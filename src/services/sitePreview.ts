import { library, type Entry } from "./library";
import { parseRef, type GitRef } from "../lib/refs";
import { request, ProviderError } from "../providers/github/client";
import { repositoryTree, repoRoot } from "./githubTree";
import { validManifest, type VirtualFile } from "../../sandbox/protocol";
export interface SiteTarget {
  ref: GitRef;
  entry: string;
  server: boolean;
}
export async function detectSite(
  current: GitRef,
  selection: Entry[],
  signal?: AbortSignal,
): Promise<SiteTarget | null> {
  const selected = selection.length === 1 ? selection[0] : undefined;
  const ref = selected ? parseRef(selected.ref) : current;
  if (selected?.kind === "file")
    return /\.html?$/i.test(selected.name)
      ? {
          ref: { ...ref, path: ref.path.split("/").slice(0, -1).join("/") },
          entry: selected.name,
          server: false,
        }
      : null;
  if (selected && selected.kind !== "dir") return null;
  const entries = await library.list(ref, signal);
  const project = entries.some((file) =>
    [
      "package.json",
      "Dockerfile",
      "requirements.txt",
      "server.js",
      "app.py",
      "composer.json",
    ].includes(file.name),
  );
  // Prefer built output over source index.html in framework projects.
  const candidates = ["docs", "dist", "build", "public"];
  const direct = entries.find(
    (file) => file.name === "index.html" && file.kind === "file",
  );
  if (direct && !project) return { ref, entry: "index.html", server: false };
  for (const directory of candidates) {
    if (!entries.some((file) => file.kind === "dir" && file.name === directory))
      continue;
    const nested = {
      ...ref,
      path: [ref.path, directory].filter(Boolean).join("/"),
    };
    if (
      (await library.list(nested, signal)).some(
        (file) => file.name === "index.html" && file.kind === "file",
      )
    )
      return { ref: nested, entry: "index.html", server: false };
  }
  if (direct) return { ref, entry: "index.html", server: project };
  return project ? { ref, entry: "index.html", server: true } : null;
}
export async function prepareSite(target: SiteTarget, signal: AbortSignal) {
  if (target.server) throw new ProviderError("siteServer");
  const { tree } = await repositoryTree(target.ref, signal);
  const prefix = target.ref.path ? target.ref.path + "/" : "";
  const nodes = tree.filter(
    (node) => node.path.startsWith(prefix) && node.mode !== "040000",
  );
  if (nodes.some((node) => !["100644", "100755"].includes(node.mode)))
    throw new ProviderError("siteSpecial");
  const files: VirtualFile[] = nodes.map((node) => ({
    path: node.path.slice(prefix.length),
    size: node.size ?? -1,
  }));
  if (
    !validManifest(files) ||
    !files.some((file) => file.path === target.entry)
  )
    throw new ProviderError("siteLimit");
  return {
    files,
    async read(path: string, readSignal: AbortSignal) {
      const node = nodes.find((node) => node.path === prefix + path);
      if (!node) throw new ProviderError("PERMISSION");
      const response = await request(
        repoRoot(target.ref) + "/git/blobs/" + encodeURIComponent(node.sha),
        readSignal,
        true,
      );
      const reader = response.body?.getReader();
      if (!reader) throw new ProviderError("siteError");
      const bytes = new Uint8Array(node.size || 0);
      let loaded = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (loaded + value.byteLength > bytes.byteLength) {
            await reader.cancel();
            throw new ProviderError("siteLimit");
          }
          bytes.set(value, loaded);
          loaded += value.byteLength;
        }
      } finally {
        reader.releaseLock();
      }
      if (loaded !== bytes.byteLength) throw new ProviderError("siteLimit");
      return bytes.buffer;
    },
  };
}
export function handoffLinks(ref: GitRef) {
  const path =
    encodeURIComponent(ref.owner) + "/" + encodeURIComponent(ref.repo);
  const branch = "/tree/" + encodeURIComponent(ref.branch);
  return {
    siteStackBlitz:
      "https://stackblitz.com/github/" +
      path +
      branch +
      (ref.path
        ? "/" + ref.path.split("/").map(encodeURIComponent).join("/")
        : ""),
    // Official repository imports were retired in 2026. Open a blank browser sandbox.
    siteCodeSandbox: "https://codesandbox.io/s/new",
    siteCodespaces: "https://codespaces.new/" + path + branch,
  };
}
export async function pagesUrl(
  ref: GitRef,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    const data = (await (
      await request(repoRoot(ref) + "/pages", signal)
    ).json()) as { html_url?: string };
    if (!data.html_url) return;
    const url = new URL(data.html_url);
    if (url.protocol !== "https:" || url.username || url.password) return;
    return url.href;
  } catch (error) {
    if (signal?.aborted) throw error;
    // Missing Pages permission or a disabled site both hide the navigation action.
    if (error instanceof ProviderError) return;
    throw error;
  }
}
