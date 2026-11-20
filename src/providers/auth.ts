import { ProviderError } from "./types";
export interface AccessToken { value: string; expiresAt: number }
export interface Auth {
  acquire(interactive: boolean): Promise<AccessToken>;
  clear(): void | Promise<void>;
}
interface GoogleToken { access_token?: string; expires_in?: number; scope?: string; error?: string }
interface GoogleClient { requestAccessToken(opts: { prompt: string }): void }
interface GoogleIdentity { accounts: { oauth2: { initTokenClient(opts: { client_id: string; scope: string; include_granted_scopes: boolean; callback(r: GoogleToken): void; error_callback(): void }): GoogleClient } } }
declare global { interface Window { google?: GoogleIdentity } }
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
let googleScript: Promise<void> | undefined;
export function googleAuth(clientId: string): Auth {
  return {
    async acquire(interactive) {
      if (!clientId) throw new ProviderError("PERMISSION");
      // Called only through an explicit Connect gesture; never from module initialization.
      if (!googleScript) googleScript = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => { googleScript = undefined; script.remove(); reject(new ProviderError("AUTH_EXPIRED")); };
        document.head.append(script);
      });
      await googleScript;
      return new Promise((resolve, reject) => {
        const api = window.google?.accounts.oauth2;
        if (!api) { reject(new ProviderError("AUTH_EXPIRED")); return; }
        api.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
          callback(r) {
            if (!r.access_token || r.error || !r.scope?.split(" ").includes(DRIVE_SCOPE)) reject(new ProviderError("AUTH_EXPIRED"));
            else resolve({ value: r.access_token, expiresAt: Date.now() + (r.expires_in || 3600) * 1000 });
          }, error_callback() { reject(new ProviderError("AUTH_EXPIRED")); },
        }).requestAccessToken({ prompt: interactive ? "consent" : "" });
      });
    }, clear() {},
  };
}
