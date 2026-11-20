import { expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { googleAuth, DRIVE_SCOPE } from "../src/providers/auth";
it("loads GIS only on Connect and requests drive.file without incremental scopes", async () => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "https://shelf.invalid" });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  try {
    const auth = googleAuth("sample-client-id");
    expect(document.querySelector("script")).toBeNull();
    const connecting = auth.acquire(true);
    const script = document.querySelector("script")!;
    expect(script.src).toBe("https://accounts.google.com/gsi/client");
    window.google = { accounts: { oauth2: { initTokenClient(opts) {
      expect(opts.scope).toBe(DRIVE_SCOPE); expect(opts.include_granted_scopes).toBe(false);
      return { requestAccessToken({ prompt }) { expect(prompt).toBe("consent"); opts.callback({ access_token: "sample-gis-token", expires_in: 3600, scope: DRIVE_SCOPE }); } };
    } } } };
    script.dispatchEvent(new dom.window.Event("load"));
    expect((await connecting).value).toBe("sample-gis-token");
    expect(dom.window.localStorage.length).toBe(0);
  } finally { Object.assign(globalThis, { window: oldWindow, document: oldDocument }); dom.window.close(); }
});
