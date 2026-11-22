# Shelf OAuth Worker

Use Wrangler 4.36 or later. Run the following from the repository root and enter each value at the prompt.

```sh
wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
wrangler deploy --config worker/wrangler.toml
```

Use the exact app origin without a trailing slash for `ALLOWED_ORIGIN`. Use a separate Worker deployment and GitHub App for local OAuth with `http://localhost:5173`.

The Workers Rate Limiting binding allows approximately 20 JSON POSTs per IP per minute at each Cloudflare location. Choose a distinct namespace ID if another Worker in your account uses this ID. GitHub grant revocation uses Basic authentication and `DELETE /applications/{client_id}/grant`. [Cloudflare binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) [GitHub grant endpoint](https://docs.github.com/en/rest/apps/oauth-applications#delete-an-app-authorization)
