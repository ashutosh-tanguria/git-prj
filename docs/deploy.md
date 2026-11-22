# Deploy Shelf M6a

Use Node 24.19.0 and npm 11.17.0. Run the commands from the repository root in PowerShell. Replace the example names with your actual Cloudflare project names and exact origins. Keep the app and sandbox on different registrable sites. With separate `pages.dev` projects, confirm the public suffix boundary and cookie isolation before adding production accounts.

## 1. Register the GitHub App

1. Open GitHub Settings → Developer settings → GitHub Apps → New GitHub App. Set the homepage to your Shelf origin.
2. Register `https://shelf-app.pages.dev/auth/github/`. For local OAuth use a separate development GitHub App with `http://localhost:5173/auth/github/`. Include the trailing slash. GitHub callbacks cannot contain URL fragments.
3. Enable expiring user access tokens. Leave Request user authorization during installation off so sign-in always starts in Shelf with state and PKCE. Turn the webhook off.
4. Under Repository permissions set Contents to Read and write and Metadata to Read. Install the app on selected repositories. Choose the app visibility appropriate for who will install it.
5. Save the public client ID and app slug. Generate a client secret and enter it only at the Wrangler secret prompt. Shelf opens `github.com/new` for repository creation with this permission set. Add the created repository to the installation, then refresh Shelf.

## 2. Deploy the Worker

```powershell
npx --yes wrangler@4.157.0 login
npx --yes wrangler@4.157.0 deploy --config worker/wrangler.toml
npx --yes wrangler@4.157.0 secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx --yes wrangler@4.157.0 secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
npx --yes wrangler@4.157.0 secret put ALLOWED_ORIGIN --config worker/wrangler.toml
```

Enter the GitHub App client ID, client secret, and exact app origin `https://shelf-app.pages.dev` without a trailing slash. Use the Worker origin printed by Wrangler as `VITE_OAUTH_WORKER_URL`. Leave observability off. The Worker returns 403 to any other browser origin. For local OAuth use a separately named Worker and rate-limit namespace with the development app secrets and `ALLOWED_ORIGIN=http://localhost:5173`.

## 3. Deploy the sandbox Pages project

```powershell
npm ci
$env:SHELF_APP_ORIGIN = 'https://shelf-app.pages.dev'
npm run sandbox:build
npx --yes wrangler@4.157.0 pages project create shelf-sandbox --production-branch main
npx --yes wrangler@4.157.0 pages deploy sandbox/dist --project-name shelf-sandbox --branch main
```

Run project creation once. For Git-integrated Pages instead, set the build command to `npm run sandbox:build`, the output directory to `sandbox/dist`, and add `SHELF_APP_ORIGIN` and `NODE_VERSION=24.19.0` to the build environment. Deploy `sandbox/dist/_headers` with the rest of the output. Check that it allows framing only by the exact app origin and includes COOP `same-origin` and COEP `require-corp`.

## 4. Deploy the app Pages project

```powershell
$env:VITE_GITHUB_APP_CLIENT_ID = 'Iv1.replace-with-public-id'
$env:VITE_GITHUB_APP_SLUG = 'replace-with-app-slug'
$env:VITE_OAUTH_WORKER_URL = 'https://shelf-oauth.your-account.workers.dev'
$env:VITE_SANDBOX_ORIGIN = 'https://shelf-sandbox.pages.dev'
npm run build
npx --yes wrangler@4.157.0 pages project create shelf-app --production-branch main
npx --yes wrangler@4.157.0 pages deploy dist --project-name shelf-app --branch main
```

For Git-integrated Pages instead, use `npm run build` and output `dist`. Set `NODE_VERSION=24.19.0` and the same public variables. Optional provider variables are `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID`, `VITE_DROPBOX_APP_KEY`, and `VITE_MS_CLIENT_ID`. See [SETUP](../SETUP.md) for provider scopes and exact callback settings. Leaving either OAuth variable unset hides GitHub App sign-in. The personal access token path is always available. Use `https://shelf-app.pages.dev/privacy/` in provider consent settings.

Verify the exact two origins and callback after deployment.

```powershell
curl.exe -I https://shelf-app.pages.dev/auth/github/
curl.exe -I https://shelf-app.pages.dev/onedrive-callback.html
curl.exe -I https://shelf-sandbox.pages.dev/
```

Check app CSP, `no-store` on the GitHub callback, the OneDrive COOP exception, and sandbox isolation headers. Follow the [M6a checklist](manual-test-m6a.md).

## 5. Build the extension ZIP locally

```powershell
$env:APP_URL = 'https://shelf-app.pages.dev'
npm run extension:zip
```

The ZIP is `dist-extension/shelf-mv3.zip`. To test it, enable Developer mode in Chrome Extensions and load `dist-extension/unpacked` via Load unpacked.
