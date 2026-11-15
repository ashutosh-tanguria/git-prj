import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  webServer: {
    command:
      "npx vite build --mode styleguide && npx vite preview --mode styleguide --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
});
