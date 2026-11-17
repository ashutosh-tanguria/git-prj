import { afterAll, beforeAll, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createRepository,
  repositoryAvailable,
} from "../src/services/repositories";
import { planPaste, setFileClipboard } from "../src/services/clipboard";
let denied = false;
let body: Record<string, unknown> = {};
const server = setupServer(
  http.all("https://api.github.com/*", async ({ request }) => {
    if (request.method === "GET") return HttpResponse.json({}, { status: 404 });
    body = (await request.json()) as Record<string, unknown>;
    return denied
      ? HttpResponse.json({}, { status: 403 })
      : HttpResponse.json({
          full_name: "ada/notes",
          private: body.private,
          default_branch: "main",
        });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
const input = {
  owner: "ada",
  user: "ada",
  name: "notes",
  private: true,
  publicConfirmed: false,
  description: "Sample",
  readme: true,
};
it("creates private, README-initialized repos and checks availability", async () => {
  denied = false;
  expect(await repositoryAvailable("ada", "notes")).toBe(true);
  const repo = await createRepository(input);
  expect(repo.private).toBe(true);
  expect(body.auto_init).toBe(true);
  await expect(createRepository({ ...input, private: false })).rejects.toThrow(
    "guardVisibilityConfirm",
  );
});
it("reports permission refusal rather than claiming success", async () => {
  denied = true;
  await expect(createRepository(input)).rejects.toThrow("PERMISSION");
});
it("cut/paste in one repository reuses the blob without reading bytes", async () => {
  setFileClipboard(
    [
      {
        name: "a.pdf",
        path: "week-1/a.pdf",
        ref: "gh:ada/notes@main/week-1/a.pdf",
        sha: "original",
        size: 42,
        kind: "file",
      },
    ],
    true,
  );
  const changes = await planPaste({
    owner: "ada",
    repo: "notes",
    branch: "main",
    path: "week-2",
  });
  expect(changes[0].kind).toBe("rename");
  expect(changes[0].baseVersion).toBe("original");
  expect(changes[0].blob).toBeUndefined();
  expect(changes[0].target.path).toBe("week-2/a.pdf");
});
it("keeps a created repository if renaming its default branch is refused", async () => {
  server.use(
    http.post("https://api.github.com/user/repos", () =>
      HttpResponse.json({
        full_name: "ada/notes",
        private: true,
        default_branch: "master",
      }),
    ),
    http.post(
      "https://api.github.com/repos/ada/notes/branches/master/rename",
      () => HttpResponse.json({}, { status: 403 }),
    ),
  );
  expect(await createRepository(input)).toMatchObject({
    full_name: "ada/notes",
    default_branch: "master",
    branchWarning: true,
  });
  server.resetHandlers();
});
it("copy/paste keeps the source and stages newly read bytes", async () => {
  server.use(
    http.get(
      "https://api.github.com/repos/ada/notes/contents/week-1/a.txt",
      () => new HttpResponse("Sample copy"),
    ),
  );
  setFileClipboard(
    [
      {
        name: "a.txt",
        path: "week-1/a.txt",
        ref: "gh:ada/notes@main/week-1/a.txt",
        sha: "source-blob",
        size: 11,
        kind: "file",
      },
    ],
    false,
  );
  const plan = await planPaste({
    owner: "ada",
    repo: "notes",
    branch: "main",
    path: "week-2",
  });
  expect(plan).toHaveLength(1);
  expect(plan[0].kind).toBe("add");
  expect(await plan[0].blob?.text()).toBe("Sample copy");
  expect(plan[0].oldPath).toBeUndefined();
  server.resetHandlers();
});
