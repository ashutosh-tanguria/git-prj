export default {
  plugins: ["./scripts/design-policy.mjs"],
  rules: {
    "shelf/tokens-only": true,
    "color-no-invalid-hex": true,
    "color-named": "never",
    "block-no-empty": true,
    "declaration-block-no-duplicate-properties": true,
  },
};
