# M3.5a Website and media preview

Use a disposable repository and a short-lived token in Shelf's Connect form. Never paste credentials into chat or this document. These checks supplement local Chromium fixtures and do not start M3.5b or M4. Tier 2 LibreOffice WebAssembly, Tier B WebContainers and Tier C Pyodide are deferred by owner decision.

## Local origins

1. Run `npm ci`. In one terminal run `npm run dev -- --host 127.0.0.1`. In another run `npm run sandbox:dev`. Open `http://127.0.0.1:5173/`, using that hostname consistently. The sandbox runs at `http://127.0.0.1:5174/`; its default `SHELF_APP_ORIGIN` matches the app.
2. Browser tests build both projects and use 4173/4174. Run the focused files `e2e/preview.spec.ts` and `e2e/site-security.spec.ts`. Test fixtures never require real credentials.

## Deploying the second Cloudflare Pages project [HUMAN]

1. Create a distinct Pages project for the sandbox. Set build command `npm ci && npm run sandbox:build`, output `sandbox/dist`, and `SHELF_APP_ORIGIN=https://YOUR_APP_HOST` with no trailing slash. This is public origin configuration, never a secret. Deploy the generated directory, including `_headers`.
2. Use a different registrable domain from Shelf. Separate `PROJECT.pages.dev` projects rely on the Pages public-suffix boundary; verify that the deployed hosts and cookies are separate sites. Nested preview hosts of one Pages project are not separate sites. Sibling custom subdomains of one registrable domain are refused.
3. Build the main Shelf Pages project with `VITE_SANDBOX_ORIGIN=https://YOUR_SANDBOX_HOST`, no trailing slash. Its generated `dist/_headers` must contain only that sandbox frame origin. Never set COEP on Shelf.
4. Inspect the hosted sandbox responses: COOP same-origin, COEP require-corp, nosniff, no-referrer, and CSP frame-ancestors containing only the exact Shelf origin. Try embedding the bootstrap from a different origin; it must fail. Run the hostile fixture against the actual deployed pair before enabling previews for users.
5. Verify sandbox storage contains no Shelf settings, provider credentials or working-copy data. Its service worker holds the selected virtual site in memory only. No Worker, OAuth app, cloud rendering account or secret is needed for M3.5a.

## Website acceptance 29, 30 and 35

1. Add a labelled static site with index.html, CSS, module JS, an image and a JSON file. Try roots at repository root and in docs, dist, build and public. A source project with package.json and no built site must show the server message and hand-offs. No install or server process should start.
2. Open Preview site from the command bar, a folder/HTML context menu and Inspector. It starts stopped. Press Run. Verify the persistent untrusted banner remains outside the repository frame. Check relative JSON fetch, module imports, an absolute /assets image, CSS and fonts.
3. Change Phone, Tablet and Desktop presets. Navigate a SPA route and reload that route; it must receive index.html. Click Reload and confirm a new session. Stop while preparing/loading and after rendering; the iframe disappears and pending reads stop. Close with Escape and check focus returns.
4. Keep external requests blocked. Requests should list a missing resource as Failed and an external fetch as Blocked. Console lists reported errors. Turn the toggle off and verify the external-server disclosure; credentials never cross. COEP can still reject resources without CORS/CORP. Restore strict mode for security checks.
5. Try a site over 500 files and one over 50 MiB. Both must show a specific limit message before fetching site bytes. A symlink/submodule refuses the complete preview. Choose a smaller built folder or hand off. Files are fetched only when the site requests them.
6. Use fixtures/hostile-site. Press Try escapes. Parent document, Shelf localStorage/cookies, top navigation, popup, worker registration, fetch exfiltration and banner removal must all report blocked. The app URL and banner remain, and no extra tab opens. Do not judge success just from absence of a console error.
7. The automated audit inspects outgoing and incoming Window/MessagePort payloads, including decoded ArrayBuffers, and frame/SW network requests. It seeds distinguishable fake provider tokens and app storage/cookies; none may appear in preview traffic. App provider Authorization headers are allowed only to api.github.com.
8. Pages appears only after GET /repos/{owner}/{repo}/pages succeeds with an HTTPS html_url. Disabled/permission-denied Pages stays hidden. Inspect the StackBlitz, CodeSandbox and Codespaces links; each is a noreferrer new tab, with no token or file upload. CodeSandbox deliberately opens /s/new with the repository-import retirement notice.

## Media acceptance 34

1. Open supported audio and video from the disposable repo. While bytes download, inspect determinate progress; cancel by closing Quick Look or changing location. Native playback uses a blob URL. Focus the player: Space toggles playback, arrows seek five seconds, F opens fullscreen. Quick Look must let the player handle these keys.
2. Reopen and reload/reconnect. The same source SHA should play from OPFS without another blob request and show Cached. Change the media on GitHub: a new SHA must download again. Test a browser without OPFS for the IndexedDB fallback and storage-full behavior for the cache-unavailable notice.
3. Test small WAV/MP3 and WebM/MP4 plus real files near the 100 MiB limit. A file above 100 MiB must show the specific message without reading its bytes. The test suite generates a playable WebM and uses a WAV; it does not claim every codec or a physical-device 100 MiB memory benchmark.
4. Test English/Hindi, dark/light, 360px and 200 percent zoom. Use NVDA/VoiceOver for controls, modal focus, progress and messages. Record browser/OS/codec/device results separately. General offline library support, cache Settings and full Wipe remain assigned to their existing milestones.

## Evidence to record

Record exact deployed origins, served headers, site/cookie boundary result, repository/fixture version, browser/device, codec, bytes and pass/fail without credentials. Production, Firefox/WebKit, physical-device memory and fluent Hindi review remain owner release gates until actually performed.
