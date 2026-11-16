import { metadata, clearMetadata } from "../src/services/metadata";
import { explorerRoute } from "../src/lib/refs";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  connect,
  clearToken,
  list,
  read,
  request,
} from "../src/providers/github/client";
import { parseRef, refString, routeRef, viewerRoute } from "../src/lib/refs";
const server = setupServer(
  http.get("https://api.github.com/user", ({ request }) =>
    request.headers.get("authorization") === "Bearer sample-token"
      ? HttpResponse.json({ login: "ada" })
      : new HttpResponse(null, { status: 401 }),
  ),
  http.get("https://api.github.com/repos/ada/notes/git/trees/main", () =>
    HttpResponse.json({
      truncated: false,
      tree: [
        {
          path: "notes.pdf",
          sha: "abc",
          mode: "100644",
          type: "blob",
          size: 1024,
        },
      ],
    }),
  ),
  http.get(
    "https://api.github.com/repos/ada/notes/contents/notes.pdf",
    () => new HttpResponse("sample bytes"),
  ),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  clearToken();
});
afterAll(() => server.close());
it("validates token without persisting it and reads a tree and raw bytes", async () => {
  expect(await connect("sample-token")).toBe("ada");
  const ref = parseRef("gh:ada/notes@main/");
  const entries = await list(ref);
  expect(entries[0].name).toBe("notes.pdf");
  expect(await (await read({ ...ref, path: "notes.pdf" })).text()).toBe(
    "sample bytes",
  );
});
it("rejects invalid credentials and foreign request hosts", async () => {
  await expect(connect("invalid")).rejects.toMatchObject({
    code: "AUTH_EXPIRED",
  });
  await expect(request("https://evil.invalid")).rejects.toMatchObject({
    code: "PERMISSION",
  });
});
it("surfaces truncation instead of showing an incomplete listing", async () => {
  server.use(
    http.get("https://api.github.com/repos/ada/notes/git/trees/main", () =>
      HttpResponse.json({ truncated: true, tree: [] }),
    ),
  );
  await expect(list(parseRef("gh:ada/notes@main/"))).rejects.toMatchObject({
    code: "TOO_LARGE",
  });
});
it("round trips reserved names and branches with slashes through deep links", () => {
  const ref = {
    owner: "ada",
    repo: "notes",
    branch: "study/week1",
    path: "semester 5/a#b%.pdf",
  };
  expect(routeRef(viewerRoute(ref))).toEqual(ref);
  expect(routeRef(explorerRoute(ref))).toEqual(ref);
  expect(parseRef(refString(ref))).toEqual(ref);
  expect(() => parseRef("gh:ada/notes@main/../secrets")).toThrow();
});

it("fetches real last-change metadata with bounded cache reuse", async () => {
  clearMetadata();
  let requests = 0;
  server.use(
    http.get(
      "https://api.github.com/repos/ada/notes/commits",
      ({ request }) => {
        requests++;
        expect(new URL(request.url).searchParams.get("path")).toBe("notes.pdf");
        return HttpResponse.json([
          {
            commit: {
              message: "Add reading notes\nDetails",
              author: { date: "2026-11-15T08:00:00Z" },
            },
          },
        ]);
      },
    ),
  );
  const value = await metadata("gh:ada/notes@main/notes.pdf");
  expect(value).toEqual({
    modified: "2026-11-15T08:00:00Z",
    lastChange: "Add reading notes",
  });
  expect(await metadata("gh:ada/notes@main/notes.pdf")).toEqual(value);
  expect(requests).toBe(1);
  clearMetadata();
});
