# README Amendment 2: Online viewing (Preview Plus)

This amendment adds milestone **M3.5 Preview Plus** between M3 and M4 and extends README sections 6.5, 9.3, 9.4, 10, 11 and 15. It overrides README.md and Amendment 1 where they conflict. Agent: merge it into README.md in place (new section 6.5b), keep numbering, and log the merge in PROGRESS.md.

Owner requirement: Shelf exists so that files can be viewed online. Downloading a file to open it defeats the product. Documents (Word, PowerPoint, Excel), videos, and websites stored in repositories must be viewable inside Shelf, at the best fidelity that can be achieved without a Shelf-operated server.

Nothing here relaxes sections 5.2, 8 or 9 except where B5 explicitly extends the network and framing rules.

---

## B1. Honest ceiling

"Any technology, however heavy, fully online" has a hard limit: anything that needs a real server process (a database, a Python or Java backend, Docker, server-side rendering) cannot run inside a browser tab. Shelf therefore uses tiers:

| Content | Tier | Where it runs | Fidelity | Cost to the user |
| --- | --- | --- | --- | --- |
| Word, Excel, PowerPoint | 1 Quick view | In the tab, small libraries | Good for text, tables, simple slides | Small download, instant |
| Word, Excel, PowerPoint, ODF | 2 High fidelity | LibreOffice compiled to WebAssembly, converts to PDF, shown in the existing PDF viewer | Near-desktop | Large one-time download (reported around 250 MB), heavy on RAM and phones; opt-in |
| Word, Excel, PowerPoint | 3 Cloud render | The user's own connected OneDrive or Google Drive renders it | Provider-grade | Temporary copy leaves GitHub for another cloud; opt-in; needs M4 |
| Static website (HTML, CSS, JS, images, SPAs) | A Virtual site | Service worker on the sandbox origin serves the repo files as a real site | Full for static output | Small |
| Node frontend project (Vite, React, Vue, Next dev, and similar) | B Run project | WebContainers on the sandbox origin | High | Large, opt-in, depends on StackBlitz infrastructure |
| Python scripts and notebooks | C Pyodide | WebAssembly Python on the sandbox origin | Good, limited packages | Large, opt-in, later if time allows |
| Anything needing a server | D Hand-off | Opens GitHub Pages, StackBlitz, CodeSandbox or Codespaces in a new tab | Provider-grade | None in Shelf |

Video and audio: play in the tab after download (progress shown), cached in OPFS.

The viewer toolbar always shows which tier is active and offers the next one up ("Quick view", "High fidelity", "Open in cloud") so the user is never stuck with a poor render.

---

## B2. Office documents

### B2.1 Tier 1 Quick view (default)

- DOCX with docx-preview, XLSX with SheetJS (verify the correctly maintained distribution and known vulnerabilities first; the npm `xlsx` package has been reported outdated, so use SheetJS's own recommended distribution or a maintained alternative), PPTX with pptx-preview (plus an EMF converter only if it works under the CSP).
- Render untrusted output inside a sandboxed iframe or isolated container; sanitise.
- State fidelity limits in a small notice for PPTX: animations, transitions, charts, SmartArt and speaker notes are not reproduced. Legacy binary `.doc` and `.ppt` cannot be handled client-side by these libraries; offer Tier 2 (LibreOffice handles them) or Download.

### B2.2 Tier 2 High fidelity (opt-in)

- Engine: LibreOffice compiled to WebAssembly (ZetaOffice and its `zetajs` wrapper is the primary candidate; licence MPL 2.0). Convert the file to PDF in the browser, store the PDF in OPFS keyed by source version, and show it in the existing PDF viewer (reuse zoom, search, thumbnails, last page).
- Alternative to evaluate: ONLYOFFICE `x2t` WebAssembly converter (reported around 36 MB). Check its licence before use (ONLYOFFICE core is, as far as known, AGPL, which conflicts with an MIT project); do not adopt it without a recorded licence decision.
- Runs on the sandbox origin (B4), because the WebAssembly threads need cross-origin isolation, which the main app cannot have (Google's scripts would break).
- Consent dialog before the first download: "High fidelity preview downloads about <size> once and uses a lot of memory. Use Wi-Fi and a computer if you can." Buttons: Download and preview, Cancel. Show a progress bar; cache the assets in the Cache API keyed by version; never precache them in the PWA shell.
- Offer the option only when the device looks capable (desktop, or at least a threshold of `navigator.deviceMemory` where available) and warn otherwise; never block it.
- Hosting: if the host caps file size (Cloudflare Pages caps individual files at 25 MiB), split and stream assets in parts (the approach used by serverless office converter projects) or host the assets on a bucket you control. If the third-party CDN of the engine is used instead, add it to the allowlist and disclose it in Privacy (the files themselves stay local).
- Maturity warning: these WebAssembly Office projects are young. The first task of M3.5 is a measured spike (B9). If the spike fails its criteria, ship Tier 1 and Tier 3 and record the decision.

### B2.3 Tier 3 Cloud render (needs M4 providers)

- OneDrive: copy the file to the app folder, call the Microsoft Graph driveItem `preview` action to get an embeddable viewer URL, show it in a sandboxed iframe, then delete the temporary copy. Verify the current endpoint and permissions.
- Google Drive: upload the Office file to the app folder with `drive.file`, show Drive's embedded preview in an iframe, then delete the copy. Verify that preview works for app-created files and what sign-in state the user needs.
- Always ask first: "This copies the file to your OneDrive (or Google Drive) temporarily so Microsoft (or Google) can render it. The copy is deleted when you close the preview." The copy is deleted on close and on next launch if the tab was killed.
- Requires `frame-src` for the provider's viewer host (B5).

---

## B3. Websites in repositories

### B3.1 Detection

A folder is a **site root** when it contains `index.html`; also check `docs/`, `dist/`, `build/`, `public/` and the repository root. A folder with `package.json` plus a known framework dependency is a **project root** (Tier B). Show a "Preview site" or "Run project" button on those folders and on `.html` files, in the command bar, the context menu and the Inspector.

### B3.2 Tier A Virtual site

- The sandbox origin (B4) registers a service worker. Shelf sends the repository files (listing plus bytes on demand through a MessageChannel); the service worker answers every request inside its scope from that virtual file system, with correct MIME types, `index.html` fallback for single-page apps, and base-path handling for absolute `/assets/...` references.
- This makes plain HTML, CSS and JS sites, portfolios, documentation sites and built SPA output (Vite, CRA, Next static export) behave like real sites, including relative `fetch` of JSON and module imports.
- Limits: 500 files and 50 MB by default (configurable up to the app's cache cap), lazily fetching files as the page requests them rather than all at once.
- External requests (CDN scripts, fonts, APIs) are allowed on the sandbox origin only if the sandbox CSP permits them; the default is allow `https:` for scripts, styles, fonts, images and connect, because this origin holds no secrets, and it is shown in a notice ("This site contacts external servers"). Provide a "Block external requests" toggle that tightens the CSP.

### B3.3 Tier B Run project (opt-in)

- WebContainers (StackBlitz) running on the sandbox origin: mount the repository files, run `npm install` and the dev or build script, show the preview URL in the iframe, stream the terminal output in a collapsible panel.
- Requirements and facts: needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` and HTTPS; it relies on StackBlitz-hosted proxies and server-side acceleration and its terms of service apply; it is free for open-source and non-commercial use and needs a commercial licence for commercial production use; browser support is best in Chromium and Firefox and limited in Safari. Shelf is an open-source, non-commercial project; record this licence reasoning in `docs/dependencies.md` and revisit if Shelf is ever commercialised.
- Opt-in consent dialog stating these dependencies and that `npm install` fetches packages from the npm registry (add the registry hosts to the sandbox origin allowlist only).
- Resource guards: cap install time, memory and output size; Stop button always visible.

### B3.4 Tier C Pyodide (later, only if time allows)

Run Python scripts and Jupyter notebooks (`.ipynb`) via Pyodide on the sandbox origin; render notebooks read-only first (cells and saved outputs) without executing anything, and add "Run" later.

### B3.5 Tier D Hand-off

Always available from the preview toolbar: Open on GitHub Pages (only when the Pages API reports it enabled), Open in StackBlitz, Open in CodeSandbox, Open in Codespaces (verify each current URL format before use and record it in PROGRESS.md). These open in a new tab and send nothing from Shelf.

---

## B4. The sandbox origin (new deployment, still no backend)

```
Shelf app (origin A)                       Sandbox (origin B, different site)
- tokens, storage, UI                      - NO tokens, NO Shelf storage
- fetches file bytes via providers         - service worker (virtual file system)
- postMessage / MessageChannel  ------->   - WebContainers, Pyodide, LibreOffice WASM
- iframe (sandboxed) loads B  <----------  - COOP + COEP headers live here only
```

- Origin B is a second static deployment on a different registrable domain from the app (for example a separate `*.pages.dev` project; verify the host treats each project as its own site). It must never share cookies, storage or credentials with origin A.
- Shelf communicates with B only through `postMessage` with strict origin checks in both directions and a per-session random channel id. Only file bytes and paths cross; never tokens.
- Origin B response headers: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless` if verified to work), `Content-Security-Policy` per feature (stricter for office conversion, looser for site preview), `frame-ancestors` limited to origin A.
- Shelf embeds B with `<iframe sandbox="allow-scripts allow-same-origin allow-popups-to-escape-sandbox">` only where needed (the iframe's origin is B, not A, so `allow-same-origin` does not expose A). Never allow top navigation. Never use `allow-forms` unless a feature requires it.
- A persistent banner on every preview of repository code: "Untrusted preview from <owner/repo>. It runs in isolation and cannot see your files or tokens." This also limits phishing risk from malicious repositories.
- Because COEP breaks cross-origin resources that lack CORP, features that need third-party embeds must not run on B unless verified.

---

## B5. Changes to sections 9.3 and 9.4

- Add origin B to `frame-src` of the Shelf app CSP and to `connect-src` only if direct messages need it (postMessage does not).
- Tier 3 adds the Microsoft and Google viewer hosts to `frame-src`, loaded only after consent.
- Tier B adds the npm registry hosts and StackBlitz's required hosts to the **sandbox origin's** allowlist only. Record the exact hosts observed.
- The network allowlist test covers origin A. Origin B has its own test that asserts it never receives or sends tokens (inspect all postMessage traffic in e2e).
- Section 9.4 "HTML previews" is replaced by this amendment; scripts in previews are allowed only on origin B.
- Hostile-fixture security tests are mandatory: a site that tries to read `window.parent`, storage and cookies of origin A, navigate the top window, open popups, exfiltrate via fetch, and spoof the banner.

---

## B6. UI

- **Viewer toolbar** for Office files: a segmented control "Quick view | High fidelity | Open in cloud". Disabled segments carry tooltips explaining why (not connected, not downloaded, not supported). Persist the user's last choice per file type.
- **Site preview toolbar**: Run or Stop, Reload, Open in new tab (hand-off menu), "Block external requests" toggle, console and requests panel (list of failed or blocked requests), viewport presets (Phone, Tablet, Desktop), and the persistent untrusted banner.
- **Download consent dialogs** use the neutral secondary button for the heavy action (not green) and show the size, what it is for, and that it is cached.
- Heavy features show real progress and can always be cancelled. Failures say what happened and what to do next (for example "This site needs a server. Open it in StackBlitz or on GitHub Pages.").
- Add every new viewer and dialog to the styleguide first, in light and dark.

---

## B7. Caching and performance

- Quick view libraries are lazy chunks; justify any chunk over 250 KB gzip in `docs/dependencies.md`.
- Heavy engines (LibreOffice WASM, WebContainers, Pyodide) are cached in the Cache API with a version key and a visible "Heavy features cache: 312 MB, Clear" row in Settings. They are never precached by the service worker and never loaded unless the user opts in.
- Converted PDFs and rendered pages are cached in OPFS under the same LRU rules as files (10.7), keyed by source version.
- Respect the file-size cap for conversion (default 100 MB input, configurable) and fail with a plain message beyond it.
- Memory guard: on phones, warn before starting Tier 2 or Tier B and offer the lighter alternative.

---

## B8. Milestone M3.5 scope

1. **Spike first** (measured, written up in `docs/spike-office.md` and `docs/spike-run-project.md`): see B9.
2. Sandbox origin deployment, service worker, MessageChannel protocol, headers, tests.
3. Tier A Virtual site, then Tier 1 Quick view for Office, video and audio verification, Tier D hand-off.
4. Tier 2 High fidelity (if the spike passes) and Tier B Run project (if the spike passes).
5. Tier 3 Cloud render is built in M4 after the OneDrive and Drive providers exist.
6. Tier C Pyodide is optional and may move to M5 or later.

---

## B9. Go and no-go spikes (do these first, record numbers)

**Office spike.** On fixtures (a text-heavy DOCX, a DOCX with images and tables, an XLSX with several sheets and formulas, a PPTX with images, charts and custom fonts, an old `.doc`, an old `.ppt`), measure for Tier 1 and Tier 2: success or failure, rendering differences versus the real file (screenshots), first-load size and time on throttled 4G, warm-load time, peak memory, and behaviour on Chromium desktop, Firefox desktop and a mid-range Android phone. Go criteria for Tier 2: converts at least 80 percent of fixtures acceptably, warm conversion of a 10 MB file under 20 seconds on desktop, no tab crash on the phone with the warning shown. Otherwise ship Tier 1 and Tier 3 only.

**Run-project spike.** Mount a small Vite React project and a plain static site; measure boot time, install time, memory, and Safari behaviour; confirm COOP and COEP setup on origin B and that nothing from origin A is reachable. Go criteria: the Vite project previews in under 90 seconds on desktop with no console errors from isolation. Otherwise ship Tiers A and D only.

---

## B10. Acceptance criteria (add to section 15)

27. A `.docx`, `.xlsx` and `.pptx` in a repository open in Shelf with Quick view and show text, tables and slide images, without downloading to disk.
28. If the Office spike passes, "High fidelity" converts the sample PPTX to PDF in the browser, opens it in the PDF viewer with zoom and search, and a second open is served from cache.
29. A folder with `index.html`, CSS, JS and images shows "Preview site" and renders as a real site; relative `fetch` of a JSON file in the repo works; a single-page app route reloads correctly.
30. A malicious fixture site cannot read origin A storage, cookies or tokens, cannot navigate the top window, and the untrusted banner cannot be removed by it.
31. If the run-project spike passes, a small Vite project installs, runs and previews; Stop ends it; closing the panel frees memory.
32. All heavy downloads require consent, show progress, can be cancelled, and are listed in Settings with a Clear action.
33. Unsupported or too-large content shows a specific message and the hand-off menu, never a blank screen.
34. Videos up to the 100 MB GitHub file limit play after download, with progress, and reopen from cache.
35. Origin B network and message traffic is covered by an e2e test proving no token or Shelf storage content is ever sent.

---

## B11. Risks

| Risk | Mitigation |
| --- | --- |
| WebAssembly Office engines are young; large and slow on phones | Spike first; opt-in; Tier 1 always available; Tier 3 later |
| ONLYOFFICE core licence (AGPL) conflicts with MIT | Prefer LibreOffice (MPL 2.0); record any licence decision |
| WebContainers depends on StackBlitz infrastructure and ToS; commercial use needs a licence | Opt-in, disclosed; hand-off alternatives; revisit if commercialised |
| Hosting limits on file size and bandwidth for large WASM assets | Split and stream, or use a bucket; measure in the spike |
| Malicious repositories running code in previews (phishing, resource abuse) | Separate origin, no secrets, persistent untrusted banner, resource caps, Stop button |
| COEP breaks third-party embeds | Keep COEP on origin B only; never load Google scripts there |
| Safari limitations for WebContainers and threaded WASM | Detect and fall back to hand-off, say so plainly |
| Fidelity disappointments (fonts, charts, animations) | Tier switcher, honest notices, cloud render tier |
