export const defaultMaxFileBytes = 50_000_000;

export const officeFormats = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
} as const;

export const uploadOrigin = "https://upload.cloudconvert.com";
export const downloadOrigin = "https://storage.cloudconvert.com";
export const turnstileOrigin = "https://challenges.cloudflare.com";

export function isVendorUrl(value: string, origin: string) {
  try {
    const url = new URL(value);
    return url.origin === origin && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}
