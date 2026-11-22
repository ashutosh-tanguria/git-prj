import {
  BrowserCacheLocation,
  CacheLookupPolicy,
  PublicClientApplication,
  type AccountInfo,
} from "@azure/msal-browser";
import type { Auth } from "../auth";
import { ProviderError } from "../types";

const SCOPES = ["Files.ReadWrite.AppFolder"];

export function oneDriveAuth(clientId: string): Auth {
  const client = new PublicClientApplication({
    auth: {
      clientId,
      authority: "https://login.microsoftonline.com/common",
      redirectUri: new URL("/onedrive-callback.html", location.origin).href,
    },
    cache: { cacheLocation: BrowserCacheLocation.MemoryStorage },
  });
  const ready = client.initialize();
  let account: AccountInfo | undefined;
  let generation = 0;
  return {
    async acquire(interactive) {
      await ready;
      const started = generation;
      try {
        const result = interactive
          ? await client.acquireTokenPopup({
              scopes: SCOPES,
              prompt: "select_account",
            })
          : account &&
            (await client.acquireTokenSilent({
              scopes: SCOPES,
              account,
              cacheLookupPolicy: CacheLookupPolicy.AccessTokenAndRefreshToken,
            }));
        if (!result?.accessToken || started !== generation)
          throw new ProviderError("AUTH_EXPIRED");
        account = result.account;
        return {
          value: result.accessToken,
          expiresAt: result.expiresOn?.getTime() ?? Date.now(),
        };
      } catch {
        throw new ProviderError("AUTH_EXPIRED");
      }
    },
    async clear() {
      generation++;
      account = undefined;
      await ready;
      await client.clearCache();
    },
  };
}
