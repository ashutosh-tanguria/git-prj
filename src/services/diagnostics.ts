import { version } from "../../package.json";
import { recentDiagnosticCodes } from "./diagnosticCodes";

function browserVersion(agent: string) {
  for (const [name, pattern] of [
    ["Edge", /Edg(?:A|iOS)?\/(\d{1,4})\b/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d{1,4})\b/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d{1,4})\b/],
    ["Safari", /Version\/(\d{1,4})\b.*Safari\//],
  ] as const) {
    const match = agent.match(pattern);
    if (match) return name + " " + match[1];
  }
  return "Unknown";
}

export function diagnostics() {
  const features = {
    IndexedDB: typeof indexedDB !== "undefined",
    OPFS: !!navigator.storage?.getDirectory,
    WebCrypto: !!globalThis.crypto?.subtle,
    "Service worker": "serviceWorker" in navigator,
    Clipboard: !!navigator.clipboard?.writeText,
    "Web Locks": !!navigator.locks,
  };
  return [
    "Shelf " + version,
    "Browser: " + browserVersion(navigator.userAgent),
    ...Object.entries(features).map(
      ([name, supported]) => name + ": " + (supported ? "yes" : "no"),
    ),
    "Recent error codes: " + (recentDiagnosticCodes().join(", ") || "none"),
  ].join("\n");
}
