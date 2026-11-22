import { GitHubOAuthSession, workerOrigin } from "./oauthSession";
import "../../i18n/githubOAuth";

const clientId = import.meta.env.VITE_GITHUB_APP_CLIENT_ID;
const key = "shelf-github-oauth";
const callback = () => location.origin + "/auth/github/";
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
let completion: Promise<GitHubOAuthSession> | undefined;

export const githubOAuthEnabled = Boolean(clientId && workerOrigin);
const slug = import.meta.env.VITE_GITHUB_APP_SLUG;
export const installationUrl = /^[a-z0-9-]+$/.test(slug ?? "")
  ? "https://github.com/apps/" + slug + "/installations/new"
  : "https://github.com/settings/installations";

export async function beginGitHubSignIn() {
  if (!githubOAuthEnabled) throw Error("configuration");
  const state = random();
  const verifier = random();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  sessionStorage.setItem(
    key,
    JSON.stringify({
      state,
      verifier,
      route: location.hash,
      started: Date.now(),
    }),
  );
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback(),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  location.assign(authorize);
}

export function completeGitHubSignIn() {
  if (!githubOAuthEnabled) return;
  if (completion) return completion;
  const stored = sessionStorage.getItem(key);
  if (!stored) return;
  sessionStorage.removeItem(key);
  completion = (async () => {
    const attempt = JSON.parse(stored);
    if (
      typeof attempt?.code !== "string" ||
      typeof attempt.verifier !== "string" ||
      Date.now() - attempt.started >= 600000
    )
      throw Error("authorization");
    return GitHubOAuthSession.exchange(
      workerOrigin,
      attempt.code,
      callback(),
      attempt.verifier,
    );
  })();
  return completion;
}

export function clearGitHubCompletion() {
  completion = undefined;
}
