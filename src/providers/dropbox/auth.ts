import { base64, hex } from "../digest";
import type { Auth } from "../auth";
import { providerFetch } from "../http";
import { ProviderError } from "../types";

const HOST = "api.dropboxapi.com";
function random() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
function waitForCode(state: string, navigate: () => void) {
  return new Promise<string>((resolve, reject) => {
    const channel = new BroadcastChannel("shelf-dropbox-" + state);
    const timeout = window.setTimeout(() => {
      channel.close();
      reject(new ProviderError("AUTH_EXPIRED"));
    }, 5 * 60_000);
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      window.clearTimeout(timeout);
      channel.close();
      if (typeof data !== "string" || !data)
        reject(new ProviderError("AUTH_EXPIRED"));
      else resolve(data);
    };
    try {
      navigate();
    } catch (error) {
      window.clearTimeout(timeout);
      channel.close();
      reject(error);
    }
  });
}
export function dropboxAuth(clientId: string): Auth {
  let refreshToken: string | undefined;
  let generation = 0;

  async function exchange(data: Record<string, string>) {
    const started = generation;
    const response = await providerFetch(
      "https://" + HOST + "/oauth2/token",
      [HOST],
      {
        method: "POST",
        body: new URLSearchParams({ ...data, client_id: clientId }),
      },
    );
    const result = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    if (started !== generation || !result.access_token || !result.expires_in)
      throw new ProviderError("AUTH_EXPIRED");
    refreshToken = result.refresh_token ?? refreshToken;
    return {
      value: result.access_token,
      expiresAt: Date.now() + result.expires_in * 1000,
    };
  }

  return {
    async acquire(interactive) {
      if (!interactive) {
        if (!refreshToken) throw new ProviderError("AUTH_EXPIRED");
        return exchange({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        });
      }
      const popup = window.open(
        "about:blank",
        "_blank",
        "popup,width=550,height=700",
      );
      if (!popup) throw new ProviderError("AUTH_EXPIRED");
      try {
        const started = generation;
        const redirect = new URL("/dropbox-callback.html", location.origin);
        const verifier = random();
        const state = random();
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier),
        );
        const challenge = base64(new Uint8Array(digest))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replace(/=+$/, "");
        const query = new URLSearchParams({
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirect.href,
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
          token_access_type: "offline",
        });
        const code = await waitForCode(state, () =>
          popup.location.replace(
            "https://www.dropbox.com/oauth2/authorize?" + query,
          ),
        );
        if (started !== generation) throw new ProviderError("AUTH_EXPIRED");
        return await exchange({
          grant_type: "authorization_code",
          code,
          code_verifier: verifier,
          redirect_uri: redirect.href,
        });
      } finally {
        popup.close();
      }
    },
    clear() {
      generation++;
      refreshToken = undefined;
    },
  };
}
