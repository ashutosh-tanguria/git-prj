import type { CloudId } from "./types";

export const mockProviders =
  (import.meta.env.DEV || __STYLEGUIDE__) &&
  import.meta.env.VITE_MOCK_PROVIDERS === "1";
export const providerIds = ["gdrive", "dropbox", "onedrive"] as const;
export const clientIds: Record<CloudId, string | undefined> = {
  gdrive: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  dropbox: import.meta.env.VITE_DROPBOX_APP_KEY,
  onedrive: import.meta.env.VITE_MS_CLIENT_ID,
};
export const cloudEnabled =
  mockProviders || providerIds.some((id) => !!clientIds[id]);
