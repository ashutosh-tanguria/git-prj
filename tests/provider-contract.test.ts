import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { providerContract } from "./provider-contract";
import { githubProvider } from "../src/providers/github/adapter";
providerContract("GitHub", () => {
  let status = 0, paged = false, writes = 0;
  const server = setupServer(http.all("https://api.github.com/*", ({ request }) => {
    const u = new URL(request.url), path = u.pathname;
    if (status) return HttpResponse.json({}, { status, headers: { "Retry-After": "30" } });
    if (request.method !== "GET") { writes++; return HttpResponse.json({ sha: "next" }); }
    if (path === "/user") return HttpResponse.json({ login: "ada", id: 42 });
    if (path === "/user/repos") return HttpResponse.json([{ full_name: "ada/notes", default_branch: "main", private: true }]);
    if (path.endsWith("/notes")) return HttpResponse.json({ size: 0, private: true });
    if (path.includes("/git/ref/")) return HttpResponse.json({ object: { sha: "head" } });
    if (path.includes("/git/commits/")) return HttpResponse.json({ tree: { sha: "tree" } });
    if (path.endsWith("/commits")) return HttpResponse.json([{ sha: "revision", commit: { message: "Add notes", author: { date: "2026-11-20" } } }]);
    if (path.includes("/contents/")) return new HttpResponse("sample reading bytes");
    return HttpResponse.json({ truncated: false, tree: [{ path: "reading-notes.txt", sha: "v1", mode: "100644", type: "blob", size: 20 }, ...(paged ? [{ path: "week-2.txt", sha: "v2", mode: "100644", type: "blob", size: 2 }] : [])] });
  }));
  server.listen({ onUnhandledFrame: "error" });
  return { provider: githubProvider(async () => "sample-contract-token", async () => {}), root: "gh:ada/notes@main/", file: "gh:ada/notes@main/reading-notes.txt", reset() { status = 0; }, pages() { paged = true; }, error(s) { status = s; }, writes: () => writes, dispose: () => server.close() };
});
