// @vitest-environment jsdom
import { expect, it } from "vitest";
import { googleAuth, DRIVE_SCOPE } from "../src/providers/auth";

it("loads GIS only on Connect and requests drive.file without incremental scopes", async () => {
  const auth = googleAuth("sample-client-id");
  expect(document.querySelector("script")).toBeNull();
  const connecting = auth.acquire(true);
  const script = document.querySelector("script")!;
  expect(script.src).toBe("https://accounts.google.com/gsi/client");
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient(opts) {
          expect(opts.scope).toBe(DRIVE_SCOPE);
          expect(opts.include_granted_scopes).toBe(false);
          return {
            requestAccessToken({ prompt }) {
              expect(prompt).toBe("consent");
              opts.callback({
                access_token: "sample-gis-token",
                expires_in: 3600,
                scope: DRIVE_SCOPE,
              });
            },
          };
        },
      },
    },
  };
  script.dispatchEvent(new Event("load"));
  expect((await connecting).value).toBe("sample-gis-token");
  expect(localStorage.length).toBe(0);
});
