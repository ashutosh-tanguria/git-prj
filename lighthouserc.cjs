module.exports = {
  ci: {
    collect: {
      startServerCommand:
        "npm run preview -- --host localhost --port 4175 --strictPort",
      startServerReadyPattern: "localhost:4175",
      url: ["http://localhost:4175/"],
      numberOfRuns: 1,
      settings: {
        onlyCategories: ["pwa", "accessibility"],
        chromeFlags: "--no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:pwa": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: "test-results/lighthouse" },
  },
};
