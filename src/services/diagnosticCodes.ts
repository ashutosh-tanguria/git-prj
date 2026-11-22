const known = new Set([
  "AUTH_EXPIRED",
  "CANCELLED",
  "CONFLICT",
  "EMPTY_REPO",
  "NOT_FOUND",
  "OFFLINE",
  "PERMISSION",
  "PROVIDER_DOWN",
  "QUOTA",
  "RATE_LIMITED",
  "TOO_LARGE",
  "UNKNOWN",
]);
const recent: string[] = [];

export function recordDiagnosticCode(code: string) {
  if (!known.has(code) || recent.at(-1) === code) return;
  recent.push(code);
  if (recent.length > 10) recent.shift();
}

export function recentDiagnosticCodes() {
  return [...recent];
}
