import { refString, type GitRef } from "../../lib/refs";
export class ProviderError extends Error {
  constructor(
    public code: string,
    public retryable = false,
  ) {
    super(code);
  }
}
export interface Repo {
  size?: number;
  full_name: string;
  default_branch: string;
  private: boolean;
}
export interface Entry {
  modified?: string | null;
  lastChange?: string | null;
  name: string;
  path: string;
  sha: string;
  size: number;
  kind: "file" | "dir" | "special";
  ref: string;
}
let token = "";
export function clearToken() {
  token = "";
}
export async function request(
  path: string,
  signal?: AbortSignal,
  raw = false,
): Promise<Response> {
  const url = new URL(path, "https://api.github.com");
  if (url.origin !== "https://api.github.com")
    throw new ProviderError("PERMISSION");
  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      redirect: "error",
      headers: {
        Accept: raw
          ? "application/vnd.github.raw+json"
          : "application/vnd.github+json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProviderError("OFFLINE", true);
  }
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new ProviderError(
      res.status === 429
        ? "RATE_LIMITED"
        : res.status === 401
          ? "AUTH_EXPIRED"
          : res.status === 403
            ? res.headers.get("x-ratelimit-remaining") === "0"
              ? "RATE_LIMITED"
              : "PERMISSION"
            : res.status === 404
              ? "NOT_FOUND"
              : "PROVIDER_DOWN",
      res.status >= 500,
    );
  }
  return res;
}
export async function connect(candidate: string) {
  token = candidate;
  try {
    const user = (await (await request("/user")).json()) as { login: string };
    return user.login;
  } catch (e) {
    clearToken();
    throw e;
  }
}
export async function repos(signal?: AbortSignal) {
  let result: Repo[] = [];
  for (let page = 1; ; page++) {
    const items = (await (
      await request("/user/repos?per_page=100&page=" + page, signal)
    ).json()) as Repo[];
    result = result.concat(items);
    if (items.length < 100) return result;
  }
}
interface TreeItem {
  path: string;
  type: string;
  mode: string;
  sha: string;
  size?: number;
}
export async function list(
  ref: GitRef,
  signal?: AbortSignal,
): Promise<Entry[]> {
  const base =
    "/repos/" +
    encodeURIComponent(ref.owner) +
    "/" +
    encodeURIComponent(ref.repo);
  let sha = ref.branch;
  let tree: TreeItem[] = [];
  for (const part of [...ref.path.split("/").filter(Boolean), ""]) {
    const data = (await (
      await request(base + "/git/trees/" + encodeURIComponent(sha), signal)
    ).json()) as { tree: TreeItem[]; truncated: boolean };
    if (data.truncated) throw new ProviderError("TOO_LARGE");
    tree = data.tree;
    if (part) {
      const dir = tree.find((x) => x.path === part && x.type === "tree");
      if (!dir) throw new ProviderError("NOT_FOUND");
      sha = dir.sha;
    }
  }
  return tree.map((item) => {
    const path = [ref.path, item.path].filter(Boolean).join("/");
    return {
      name: item.path,
      path,
      sha: item.sha,
      size: item.size || 0,
      kind:
        item.type === "tree"
          ? "dir"
          : item.mode === "100644" || item.mode === "100755"
            ? "file"
            : "special",
      ref: refString({ ...ref, path }),
    };
  });
}
export async function read(ref: GitRef, signal?: AbortSignal) {
  const res = await request(
    "/repos/" +
      encodeURIComponent(ref.owner) +
      "/" +
      encodeURIComponent(ref.repo) +
      "/contents/" +
      ref.path.split("/").map(encodeURIComponent).join("/") +
      "?ref=" +
      encodeURIComponent(ref.branch),
    signal,
    true,
  );
  return res.blob();
}
