import { expect, it, vi } from "vitest";
import { ProviderError } from "../src/providers/types";
import { diagnostics } from "../src/services/diagnostics";

it("copies only browser family and major version and whitelisted codes", () => {
  vi.stubGlobal("navigator", {
    userAgent: "Chrome/127.0.1 raw-file.txt ghu_private",
  });
  try {
    new ProviderError("RATE_LIMITED", true, { retryAfter: 12345 });
    new ProviderError("raw-file.txt ghu_private");
    const output = diagnostics();
    expect(output).toContain("Browser: Chrome 127");
    expect(output).toContain("Recent error codes: RATE_LIMITED");
    for (const secret of ["ghu_private", "raw-file.txt", "127.0.1", "12345"]) {
      expect(output).not.toContain(secret);
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
