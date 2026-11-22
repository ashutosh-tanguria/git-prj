import { readBody } from "./src/readBody";
import { render, type RenderEnv } from "./src/render";
export { RenderQuota } from "./src/quota";
interface Env extends RenderEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_LIMIT: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

const paths = new Set(["/github/token", "/github/refresh", "/github/revoke"]);
const maxBody = 4096;
const credential = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,1024}$/.test(value);
const pkce = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
const seconds = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = new Headers({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    });
    const fail = (status: number, error: string) =>
      Response.json({ error }, { status, headers });
    const origin = request.headers.get("Origin");
    if (!origin || origin !== env.ALLOWED_ORIGIN) return fail(403, "origin");
    headers.set("Access-Control-Allow-Origin", origin);
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith("/render/")) return render(request, env, headers);
    if (!paths.has(path) || url.search) return fail(404, "path");
    if (request.method === "OPTIONS") {
      const requested = request.headers
        .get("Access-Control-Request-Headers")
        ?.trim()
        .toLowerCase();
      if (
        request.headers.get("Access-Control-Request-Method") !== "POST" ||
        (requested && requested !== "content-type")
      )
        return fail(403, "preflight");
      headers.set("Access-Control-Allow-Methods", "POST");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      headers.set("Allow", "POST, OPTIONS");
      return fail(405, "method");
    }
    if (
      request.headers
        .get("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    ) {
      return fail(415, "content_type");
    }
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) return fail(403, "client");
    try {
      if (!(await env.OAUTH_LIMIT.limit({ key: ip })).success) {
        headers.set("Retry-After", "60");
        headers.set("Access-Control-Expose-Headers", "Retry-After");
        return fail(429, "rate_limit");
      }
    } catch {
      return fail(503, "rate_limit_unavailable");
    }
    if (Number(request.headers.get("Content-Length")) > maxBody)
      return fail(413, "size");
    let input: Record<string, unknown>;
    try {
      const body = await readBody(request, maxBody);
      if (body === null) return fail(413, "size");
      const value: unknown = JSON.parse(body);
      if (!value || typeof value !== "object" || Array.isArray(value))
        return fail(400, "input");
      input = value as Record<string, unknown>;
    } catch {
      return fail(400, "input");
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)
      return fail(503, "configuration");
    try {
      if (path === "/github/revoke") {
        if (!credential(input.access_token)) return fail(400, "input");
        const upstream = await fetch(
          "https://api.github.com/applications/" +
            encodeURIComponent(env.GITHUB_CLIENT_ID) +
            "/grant",
          {
            method: "DELETE",
            headers: {
              Accept: "application/vnd.github+json",
              Authorization:
                "Basic " +
                btoa(env.GITHUB_CLIENT_ID + ":" + env.GITHUB_CLIENT_SECRET),
              "Content-Type": "application/json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ access_token: input.access_token }),
            redirect: "error",
          },
        );
        if (upstream.status === 204)
          return new Response(null, { status: 204, headers });
        return fail(upstream.status === 422 ? 400 : 502, "revocation_failed");
      }

      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
      });
      if (path === "/github/token") {
        if (
          !credential(input.code) ||
          input.redirect_uri !== origin + "/auth/github/" ||
          (input.code_verifier !== undefined && !pkce(input.code_verifier))
        )
          return fail(400, "input");
        params.set("code", input.code);
        params.set("redirect_uri", input.redirect_uri);
        if (pkce(input.code_verifier))
          params.set("code_verifier", input.code_verifier);
      } else {
        if (!credential(input.refresh_token)) return fail(400, "input");
        params.set("grant_type", "refresh_token");
        params.set("refresh_token", input.refresh_token);
      }
      const upstream = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: { Accept: "application/json" },
          body: params,
          redirect: "error",
        },
      );
      if (upstream.status >= 429) return fail(502, "upstream");
      const result = await upstream.json();
      if (
        ["bad_verification_code", "bad_refresh_token"].includes(result?.error)
      )
        return fail(401, "credential");
      if (result?.error) return fail(502, "upstream");
      if (
        !upstream.ok ||
        !credential(result?.access_token) ||
        !credential(result?.refresh_token) ||
        !seconds(result?.expires_in) ||
        !seconds(result?.refresh_token_expires_in)
      )
        return fail(502, "upstream");
      return Response.json(
        {
          access_token: result.access_token,
          expires_in: result.expires_in,
          refresh_token: result.refresh_token,
          refresh_token_expires_in: result.refresh_token_expires_in,
        },
        { headers },
      );
    } catch {
      return fail(502, "upstream");
    }
  },
};
