import { ProviderError } from "./types";
export function allowedUrl(value: string, hosts: readonly string[]) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !hosts.includes(url.hostname))
    throw new ProviderError("PERMISSION");
  return url;
}
export async function providerFetch(url: string, hosts: readonly string[], init: RequestInit = {}, expire?: () => void) {
  allowedUrl(url, hosts);
  let res: Response;
  try { res = await fetch(url, { ...init, credentials: "omit", redirect: "error" }); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ProviderError("OFFLINE", true, { uncertain: !!init.method && init.method !== "GET" });
  }
  if (res.ok) return res;
  const text = await res.text();
  const code = res.status === 401 ? "AUTH_EXPIRED" : res.status === 429 ? "RATE_LIMITED"
    : res.status === 507 || /quota|insufficient_space|storageLimitExceeded/i.test(text) ? "QUOTA"
    : res.status === 413 ? "TOO_LARGE" : res.status === 412 || res.status === 409 ? "CONFLICT"
    : res.status === 404 ? "NOT_FOUND" : res.status === 403 ? /rateLimit|too_many_requests/i.test(text) ? "RATE_LIMITED" : "PERMISSION"
    : res.status >= 500 ? "PROVIDER_DOWN" : "UNKNOWN";
  if (code === "AUTH_EXPIRED") expire?.();
  const retry = res.headers.get("Retry-After");
  const retryAfter = retry ? /^\d+$/.test(retry) ? Number(retry) : Math.max(0, (Date.parse(retry) - Date.now()) / 1000) : undefined;
  throw new ProviderError(code, res.status >= 500 || (code === "RATE_LIMITED" && retryAfter !== undefined), { retryAfter });
}
export async function readResponse(res: Response, onProgress?: (n: number, total: number) => void, signal?: AbortSignal) {
  const reader = res.body?.getReader();
  if (!reader) return res.blob();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let n = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      parts.push(new Uint8Array(value)); n += value.length;
      onProgress?.(n, Number(res.headers.get("Content-Length")) || n);
    }
    return new Blob(parts, { type: res.headers.get("Content-Type") || "application/octet-stream" });
  } finally { await reader.cancel(); }
}
