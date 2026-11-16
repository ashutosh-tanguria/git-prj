export interface GitRef {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}
export function refString(r: GitRef) {
  return (
    "gh:" +
    encodeURIComponent(r.owner) +
    "/" +
    encodeURIComponent(r.repo) +
    "@" +
    encodeURIComponent(r.branch) +
    "/" +
    r.path.split("/").map(encodeURIComponent).join("/")
  );
}
export function parseRef(value: string): GitRef {
  const m = /^gh:([^/]+)\/([^@]+)@([^/]+)\/(.*)$/.exec(value);
  if (!m) throw new Error("INVALID_REF");
  const [owner, repo, branch, path] = m.slice(1).map(decodeURIComponent);
  if (
    [owner, repo, branch].some((x) => !x) ||
    path.split("/").some((x) => x === ".." || x === "." || x === "\0")
  )
    throw new Error("INVALID_REF");
  return { owner, repo, branch, path };
}
export function routeRef(hash: string) {
  if (hash.startsWith("#/view/"))
    return parseRef(decodeURIComponent(hash.slice(7)));
  if (hash.startsWith("#/gh/")) return parseRef("gh:" + hash.slice(5));
  return null;
}
export function explorerRoute(r: GitRef) {
  return "#/gh/" + refString(r).slice(3);
}
export function viewerRoute(r: GitRef) {
  return "#/view/" + encodeURIComponent(refString(r));
}
