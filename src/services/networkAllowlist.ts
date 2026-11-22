import {
  ONE_DRIVE_DOWNLOAD_SUFFIX,
  ONE_DRIVE_UPLOAD_SUFFIX,
} from "../providers/onedrive/hosts";

export const appThirdPartyHosts = [
  "api.github.com",
  "raw.githubusercontent.com",
  "github.com",
  "www.googleapis.com",
  "accounts.google.com",
  "apis.google.com",
  "docs.google.com",
  "api.dropboxapi.com",
  "content.dropboxapi.com",
  "www.dropbox.com",
  "graph.microsoft.com",
  "login.microsoftonline.com",
];
export const oneDriveTransferSuffixes = [
  ONE_DRIVE_DOWNLOAD_SUFFIX,
  ONE_DRIVE_UPLOAD_SUFFIX,
];
export const explicitHandOffHosts = [
  "stackblitz.com",
  "codesandbox.io",
  "codespaces.new",
];

export function appRequestAllowed(url: URL, origins: string[]) {
  return (
    origins.includes(url.origin) ||
    (url.protocol === "https:" &&
      !url.port &&
      (appThirdPartyHosts.includes(url.hostname) ||
        oneDriveTransferSuffixes.some((suffix) =>
          url.hostname.endsWith(suffix),
        )))
  );
}
