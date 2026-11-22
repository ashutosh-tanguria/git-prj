import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import worker from "../worker/index";

const origin = "https://shelf.example";
const tokens = { access_token: "ghu_mock", refresh_token: "ghr_mock", expires_in: 28800, refresh_token_expires_in: 10000 };
const exchange = vi.fn();
const revoke = vi.fn();
const limit = vi.fn(async (input: { key: string }) => ({ success: !!input.key }));
const env = { ALLOWED_ORIGIN: origin, GITHUB_CLIENT_ID: "Iv1.mock", GITHUB_CLIENT_SECRET: "mock-secret", OAUTH_LIMIT: { limit } };
const server = setupServer(
  http.post("https://github.com/login/oauth/access_token", async ({ request }) => {
    const body = new URLSearchParams(await request.text());
    exchange(body);
    return body.get("code") === "invalid"
      ? HttpResponse.json({ error: "bad_verification_code", error_description: "mock-secret" })
      : HttpResponse.json({ ...tokens, other: "mock-secret" });
  }),
  http.delete("https://api.github.com/applications/Iv1.mock/grant", async ({ request }) => {
    revoke(request.headers.get("Authorization"), await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const redirect_uri = origin + "/auth/github/";
function send(path = "token", body: unknown = { code: "valid", redirect_uri }, init?: RequestInit) {
  return worker.fetch(new Request("https://worker.example/github/" + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.10" },
    body: JSON.stringify(body),
    ...init,
  }), env);
}

describe("OAuth worker", () => {
  it("exchanges a valid code and returns only the token fields", async () => {
    const response = await send();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(tokens);
    expect(exchange.mock.lastCall?.[0].get("redirect_uri")).toBe(redirect_uri);
  });

  it("rejects invalid codes without echoing GitHub details", async () => {
    const response = await send("token", { code: "invalid", redirect_uri });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "credential" });
  });

  it("refreshes with the refresh grant and revokes the OAuth grant", async () => {
    expect(await (await send("refresh", { refresh_token: tokens.refresh_token })).json()).toEqual(tokens);
    expect(exchange.mock.lastCall?.[0].get("grant_type")).toBe("refresh_token");
    expect((await send("revoke", { access_token: tokens.access_token })).status).toBe(204);
    expect(revoke).toHaveBeenCalledWith("Basic " + btoa("Iv1.mock:mock-secret"), { access_token: tokens.access_token });
  });

  it("only accepts exact-origin POST and browser preflight on known paths", async () => {
    const wrong = await send("token", undefined, { headers: { Origin: origin + ".other" } });
    expect(wrong.status).toBe(403);
    expect(wrong.headers.has("Access-Control-Allow-Origin")).toBe(false);
    const preflight = await send("token", undefined, { method: "OPTIONS", body: null, headers: {
      Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
    } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    expect((await send("token", undefined, { method: "GET", body: null })).status).toBe(405);
    expect((await send("unknown")).status).toBe(404);
    expect((await send("token", undefined, { headers: { Origin: origin, "Content-Type": "text/plain" } })).status).toBe(415);
  });

  it("rejects oversized bodies without a length header and refuses other redirect URIs", async () => {
    expect((await send("token", { code: "x".repeat(4096), redirect_uri })).status).toBe(413);
    expect((await send("token", { code: "valid", redirect_uri: origin + "/other" })).status).toBe(400);
  });

  it("uses the connecting IP and refuses requests over the rate limit", async () => {
    limit.mockResolvedValueOnce({ success: false });
    const response = await send();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(limit).toHaveBeenLastCalledWith({ key: "192.0.2.10" });
  });
});
