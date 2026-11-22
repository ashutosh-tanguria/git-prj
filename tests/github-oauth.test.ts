import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  connect,
  clearToken,
  repos,
  request,
  revokeGitHubSession,
} from "../src/providers/github/client";
import { GitHubOAuthSession } from "../src/providers/github/oauthSession";

const worker = "https://worker.example";
const api = "https://api.github.com";
const tokens = (index: number) => ({
  access_token: "ghu_fixture_" + index,
  expires_in: 3600,
  refresh_token: "ghr_fixture_" + index,
  refresh_token_expires_in: 100000,
});
const rotate = vi.fn();
const revoke = vi.fn();
let next = 1;
const server = setupServer(
  http.post(worker + "/github/token", () => HttpResponse.json(tokens(1))),
  http.post(worker + "/github/refresh", async ({ request }) => {
    rotate(await request.json());
    return HttpResponse.json(tokens(++next));
  }),
  http.post(worker + "/github/revoke", async ({ request }) => {
    revoke(await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(api + "/user", () => HttpResponse.json({ login: "tester" })),
  http.get(api + "/user/installations", () =>
    HttpResponse.json({ installations: [{ id: 18 }, { id: 22 }] }),
  ),
  http.get(api + "/user/installations/:id/repositories", ({ params }) =>
    HttpResponse.json({
      repositories: [
        { full_name: "tester/shared" },
        { full_name: "tester/repo-" + String(params.id) },
      ],
    }),
  ),
  http.get(api + "/needs-refresh", ({ request }) =>
    request.headers.get("Authorization") === "Bearer ghu_fixture_1"
      ? new HttpResponse(null, { status: 401 })
      : HttpResponse.json({ ok: true }),
  ),
);
beforeAll(() => server.listen());
afterEach(() => {
  clearToken();
  vi.useRealTimers();
  rotate.mockClear();
  revoke.mockClear();
  next = 1;
});
afterAll(() => server.close());

async function signIn() {
  const session = await GitHubOAuthSession.exchange(
    worker,
    "code",
    "https://app.example/auth/github/",
    "verifier",
  );
  expect(await connect(session)).toBe("tester");
  return session;
}

it("lists GitHub App installations and deduplicates their accessible repositories", async () => {
  await signIn();
  expect((await repos()).map((repo) => repo.full_name)).toEqual([
    "tester/shared",
    "tester/repo-18",
    "tester/repo-22",
  ]);
});

it("refreshes before expiry and revokes with the rotated access token", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const session = await signIn();
  vi.setSystemTime(Date.now() + 3_580_000);
  expect(await session.token()).toBe("ghu_fixture_2");
  expect(rotate).toHaveBeenCalledWith({ refresh_token: "ghr_fixture_1" });
  await revokeGitHubSession();
  expect(revoke).toHaveBeenCalledWith({ access_token: "ghu_fixture_2" });
});

it("retries a 401 using one refresh for parallel requests", async () => {
  await signIn();
  const results = await Promise.all([
    request("/needs-refresh"),
    request("/needs-refresh"),
  ]);
  expect(await Promise.all(results.map((response) => response.json()))).toEqual(
    [{ ok: true }, { ok: true }],
  );
  expect(rotate).toHaveBeenCalledTimes(1);
});
