# Shelf progress

### M6a slice 1 (2026-11-22)

- Status: Stateless GitHub token exchange, refresh and grant revocation use strict CORS, bounded JSON and fixed GitHub endpoints.
- Decisions: GitHub documents Basic-authenticated DELETE /applications/{client_id}/grant for GitHub App OAuth grants. Cloudflare's native Rate Limiting binding keys on CF-Connecting-IP with a 20/60 threshold per location. [GitHub](https://docs.github.com/en/rest/apps/oauth-applications#delete-an-app-authorization) [Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- Not done: Browser sign-in, PWA, extension and final deployment instructions follow.
- Manual steps: Register the exact static callback and configure Worker secrets as documented in worker/README.md.
- Known issues: Rate limits are approximate and local to each Cloudflare location. Real deployment requires the owner account.

### M5b complete (2026-11-22)

- Status: M5b delivers quick access, collections and tags, Grid and Columns, duplicate review and ZIP export. The English and Hindi Styleguide has specimens for all six surfaces. Acceptance items 54 and 55 describe collections and ZIP export.
- Decisions: Keep collection references scoped to their provider account. Stage roaming metadata through the existing transfer and Push flow. Cache thumbnails by version and size. ZIP export includes empty folders and refuses archives above 100 MiB before reading their body bytes.
- Not done: Real-account portability, cross-provider browser behavior, physical-device scroll performance and screen-reader verification remain owner acceptance.
- Manual steps: Follow [the M5b checklist](docs/manual-test-m5b.md) with disposable data and authorized test accounts.
- Known issues: Duplicate scans cover the current listing and files in local caches. Missing sizes and read failures are reported as skipped. Columns retain the root address and preview up to 4 KiB of supported text. Thumbnails for unsupported or oversized files use glyphs.
- Validation: The final `npm run check` passed with 294 tests and a 153282-byte gzip shell. Focused Chromium cases verified organizer drag and ZIP export, PDF rendering and 10,000-item virtualization, Columns navigation, guarded duplicate deletes, ZIP memory refusal and nested paths, offline PDF reload, and accessibility. One update run refreshed only light-default, dark-default and hindi-360.

### M5b slice 3 (2026-11-22)

- Status: The palette runs SHA-256 duplicate scans and exports a selection or collection as ZIP. Duplicate results lead to guarded, versioned pending deletes. ZIP streams provider or cached bytes, shows progress and can be cancelled.
- Decisions: Scan files from the current listing and local listing and byte caches. Review deletes one provider location or GitHub branch at a time. ZIP includes nested folders, uses unique safe paths and refuses archives above 100 MiB.
- Not done: Styleguide specimens, acceptance criteria, the manual checklist and final validation follow.
- Manual steps: Verify cross-account and large-download behavior on target browsers with disposable data.
- Known issues: Scans report files with missing sizes or unreadable bytes. Cached reads may be available offline. Staging duplicate deletes requires a current connection and one versioned survivor per group.

### M5b slice 2 (2026-11-22)

- Status: View switches between List, Grid and Columns in the command bar or palette. Grid uses three sizes and versioned thumbnails. Columns show counts, support resizing and offer an inline file preview.
- Decisions: Thumbnail rendering is bounded to one request at a time and cached by account, file version and size. Columns retain the root address while drilling. SVG and oversized thumbnails use glyphs.
- Not done: Duplicate finder, ZIP export and final acceptance follow in M5b.
- Manual steps: Verify scrolling and keyboard announcements on target hardware and with a screen reader.
- Known issues: Text previews show the first 4 KiB. Files without a bounded thumbnail or inline text preview can still open through the normal viewer.

### M5b slice 1 (2026-11-22)

- Status: Recent, Favorites, collections and tags use IndexedDB. Virtual locations include the Provider column. References can be added by context menu or drag, and tags appear under the palette's # prefix.
- Decisions: Recent keeps the latest 100 successful opens. Portable JSON includes collections and tags, merges by label ID, and uses the existing transfer picker and guarded Push for export. Import reads from the current provider folder.
- Not done: Grid, Columns, duplicate finding, ZIP export and final acceptance follow in M5b.
- Manual steps: For a portability round trip, choose an owned destination, review the staged export and Push it before importing from that folder.
- Known issues: References from unavailable accounts become visible when the matching account reconnects. Import keeps the local label name and colour when IDs match.

### M5a complete (2026-11-22)

- Status: M5a delivers the licence correction, offline cache and Storage, full-text search, folder search, and the command palette. The final slice completes the English and Hindi specimens with the offline cache-miss and storage-full messages. M5a Chromium covers acceptance 8, 12 and 17.
- Decisions: Preserved the existing M5a commits. The acceptance 8 test aborts intercepted GitHub requests during offline reload so the fixture cannot supply fresh bytes. Switch view uses the existing Explorer and Split view. Reconnect Push authorization belongs to the reviewed batch and current session. The offline shell precaches compiled application assets and fonts, and caches viewer assets after use.
- Not done: Real-account OAuth, provider conditional-response visibility, production performance and physical-device verification are owner checks. M5b and M6 are outside this milestone.
- Manual steps: Follow [the M5a acceptance checklist](docs/manual-test-m5a.md) with disposable accounts and a private test repository, including the offline check for a file that has never been cached.
- Known issues: Browser storage can be evicted. Scanned PDFs require OCR outside M5a. Wiping while offline signs out and clears local data, with an online reload needed to restore the app shell.
- Validation: The single `npm run check` passed with 287 tests and a 147998-byte gzip shell. Eight focused Chromium cases passed, including 20 MB page 50 after an offline reload, the page 12 phrase highlight, wipe, palette keyboard navigation, Hindi accessibility, forced colours and 200 percent reflow. Only light-default, dark-default and hindi-360 were refreshed, each once. The dark snapshot passed on a targeted retry after a Windows file lock interrupted its initial write. The preceding integration commit also passed the licence checker.

### M5a slice 3: Search and command palette

- Status: Ctrl+F filters the current folder. Ctrl+K opens the keyboard-accessible palette with all five prefixes. Chromium passed keyboard search, disabled ZIP and tag states, and page 12 selection. The full check passed with 286 tests.
- Decisions: Switch view uses the existing Explorer and Split view. Command shortcuts use the existing registry; the palette reflects a customized Push binding. Discard all pending requires confirmation and uses the existing journal cancellation behavior.
- Not done: Styleguide specimens, final storage acceptance and the manual checklist follow.
- Manual steps: Check browser and assistive-technology behavior for the reserved keys on target devices.
- Known issues: Tags and selection ZIP export are deferred to M5b.

### M5a slice 2: Full-text index

- Status: A cancellable worker indexes cached PDF pages and text files. The Chromium page 12 phrase case opened the viewer at the match. The full check passed with 283 tests.
- Decisions: MiniSearch loads from a verified local source build. Persistent indexes expire with the corresponding bytes or version. The worker evicts oldest indexes first under the 100 MB limit.
- Not done: The palette and final browser acceptance follow.
- Manual steps: Check scan notices on representative PDFs during owner acceptance.
- Known issues: OCR is outside M5a. An evicted index stays evicted until its source is cached again at a new version.

### M5a slice 1: Cache and offline

- Status: The byte cache, pins, version checks, folder cache, offline Push controls, and Storage actions are wired. The full check passed with 282 tests and a 145483-byte gzip shell.
- Decisions: Cache records are scoped by provider account. Existing credentials remain in memory. The reconnect option is tied to the reviewed batch and the current session. The service worker caches app assets and never handles provider requests.
- Not done: Full-text search, filename search, and final browser acceptance follow.
- Manual steps: Browser and account checks follow the final M5a checklist.
- Known issues: Private browser storage can be purged by the browser. Real-account ETag visibility and provider behavior still need owner verification.

### M5a licence checker

- Status: Locked SPDX alternatives are evaluated and JSZip is approved under MIT. The checker and the full check passed with 278 tests.
- Decisions: Review every requirement in an AND expression. Approve Zlib for the existing MIT AND Zlib dependency.
- Not done: M5a feature slices follow.
- Manual steps: None.
- Known issues: SPDX exceptions require individual review.

### M4b complete (2026-11-22)

- Status: All five slices are implemented locally. Transfers verify before recoverable deletion, retain interrupted work across reload, and offer a backup of pending drafts and local bytes. PDF split, Split view, Local folder and English/Hindi specimens are included. README acceptance items 9, 18 and 50 to 53 describe the verified behavior.
- Decisions: Resume reconciles prior network attempts and asks for fresh GitHub approvals where needed. Restoring a backup stages fresh drafts and disregards any verification receipts. The three snapshot baselines cover default light, default dark and Hindi at 360 px. No new runtime network host was added.
- Not done: Real-account OAuth, provider CORS and physical-device testing remain owner checks. M5 was not started.
- Manual steps: Follow docs/manual-test-m4b.md using disposable credentials and revoke them afterward.
- Known issues: Cloud directory transfers require selecting their files. Classic working-copy ZIPs have a 4 GiB format cap, and the local export fallback materializes the final ZIP. The existing standalone licence checker flags JSZip's dual-licence expression.
- Validation: One final `npm run check` passed with 272 tests and a 153168-byte gzip production shell. Ten focused Chromium cases passed, covering native directory handles, fallback import and ZIP export, backup restore, transfer reload, pane history, drag and 360 px touch selection. Light, dark and Hindi snapshots refreshed in one run, with accessibility, forced-colour and reflow checks. MSW and generated PDF tests cover journal states, cancellation, partial failure, hash and size guards, and part sizing.

### M4b slice 4: Split view and Local folder (2026-11-22)

- Status: Split panes have independent locations, list/grid views and history. Drag stages a copy, Shift-drop stages a move, and touch selection offers both actions. Local folder import preserves nested paths. Export streams to a chosen directory or downloads a client-zip archive.
- Decisions: Local folders are picker operations, so they have no sync or provider account. Import stages copies and asks for Keep both on an overlapping folder. Export picks an unused filename when an existing local file has the same name.
- Not done: Final specimens, acceptance documentation and owner checklist follow.
- Manual steps: Confirm the native folder picker and touch behavior with the owner browser and device. Chromium uses injected directory handles for the native API branches and uses MSW for every provider request.
- Known issues: Empty local directories contain no files to stage. ZIP fallback materializes the final archive as a download Blob. Chromium passed split drag/history, nested import, native picker, and ZIP fallback coverage.

### M4b slice 3: PDF split (2026-11-22)

- Status: The blocked-upload dialog and Size ledger can split a PDF in a lazy pdf-lib worker. Measured consecutive parts stage as guarded adds while the original remains untouched.
- Decisions: Use 90 MiB for parts and refuse inputs above 300 MiB before reading. Try the source-size estimate, serialize and adjust against the measured bytes. Refuse existing or staged part names.
- Not done: Split view, Local folder and final acceptance follow.
- Manual steps: Exercise the generated parts in an owner-managed browser with a throwaway repo.
- Known issues: Encrypted, corrupt or unsupported PDFs report a plain error. Generated fixture tests cover page order, immutable input, the single-page refusal and the input limit. Large-device memory behavior remains an owner check.

### M4b slice 2: Transfer actions (2026-11-22)

- Status: Context menu and command bar Move to and Copy to, cross-provider and cross-repository Cut/Paste, connected-provider guard remedies, and Size ledger Move selected stage journal entries. Pending review shows one row per file, progress, retry, cancellation and recoverable-delete details.
- Decisions: Recheck GitHub public, size and sensitive-name approvals when the user starts or resumes a mutation. Require Keep both for an overlapping directory so a folder transfer cannot discard unrelated destination files. Keep existing same-branch GitHub Paste on its blob-reuse path.
- Not done: PDF split, Split view, Local folder and final acceptance follow.
- Manual steps: The owner can reconnect after reload and use Pending to resume. Real provider acceptance follows the final checklist.
- Known issues: GitHub subtree transfers expand into file rows. Cloud directory moves and copies require selecting their files individually. Chromium MSW covers a cross-provider staged move through reload and recoverable deletion. The full check passes with 266 tests and a 152310-byte gzip shell.

### M4b slice 1: Transfer journal (2026-11-22)

- Status: Added IndexedDB journal, streamed OPFS working bytes, incremental native and SHA-256 worker digests, conditional recoverable deletes, and mock tests for checkpoints, partial failure, cancellation and two atomic GitHub ref updates.
- Decisions: Use one GitHub atomic commit per target file. Drive retries reuse a reserved file ID. A mismatch flags the target and only retries replacement against a recorded version. Transfer execution derives confirmations from the current session and uses the existing GitHub guards. Cloud size and quota failures use provider responses and reported quota.
- Not done: User entry points, Pending controls and remaining M4b slices follow.
- Manual steps: None for MSW validation. The final owner checklist will cover browser and account behavior.
- Known issues: GitHub's blob endpoint requires JSON base64, so only that provider materializes one file for the final upload request. The independent licence script still rejects the existing JSZip dual-licence expression. The transfer dependency is MIT and was installed from the local npm cache.

### M4b gate checkpoint (2026-11-22)

- Status: The single `npm run check` command passes all six gates with 250 tests and a 151886-byte gzip shell.
- Decisions: The previous check stopped on a lint error that was already fixed in the provider integration commit. This checkpoint records the verified result without changing the gates.
- Not done: M4b feature slices follow this checkpoint.
- Manual steps: None for this checkpoint.
- Known issues: No gate failure reproduced.

### M4a slice 5: Provider integration (2026-11-22)

- Status: Cloud providers are available in Connect, Settings and the mixed Locations tree when configured. The active provider shows connection status and available quota with a warning below 5%. Uploads, replacements, folders, renames, same-provider moves and recoverable deletes stage locally. Push writes sequentially, reports per-file progress and durably removes only confirmed items from Pending. English and Hindi copy, Styleguide specimens and docs/manual-test-m4a.md are included.
- Decisions: Bind the durable queue to the provider account or app-root ID. Serialize stage and Push across tabs. Check the remote version or destination name before each write. Keep a durable attempt marker when a response could have been lost, then recheck the target and require review before replay. Dropbox documents a 150 MiB single-request limit and conditional deletion by parent revision. [Dropbox upload sessions](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-start) [Dropbox delete](https://dropbox.github.io/SwiftyDropbox/api-docs/latest/Classes/FilesRoutes.html)
- Not done: Live OAuth, account-specific CORS and signed endpoints remain owner acceptance. No M4b work started.
- Manual steps:
  - [HUMAN] Google: enable the Drive API, create a Web OAuth client, publish the consent screen to production, and add the exact deployed and development JavaScript origins. Set VITE_GOOGLE_CLIENT_ID to the public client ID. Grant only drive.file and confirm GIS opens from Connect.
  - [HUMAN] Dropbox: create a scoped App folder app. Enable account_info.read, files.metadata.read, files.metadata.write, files.content.read and files.content.write. Register exact redirect URIs ending in /dropbox-callback.html for deployed and development origins. Set VITE_DROPBOX_APP_KEY to the public app key. No secret.
  - [HUMAN] Microsoft: create an Entra app supporting the intended work and personal accounts. Add a Single-page application platform and the exact /onedrive-callback.html URI for each origin. Grant delegated Files.ReadWrite.AppFolder, set VITE_MS_CLIENT_ID to the public client ID, and verify the redirect bridge has no Cross-Origin-Opener-Policy header. Confirm the signed hostnames before admitting any additional Microsoft-owned domain.
- Known issues: Drive edits and deletes require CORS access to the provider's ETag. Dropbox folder items lack a revision token, so destructive folder operations require a version that the adapter can check. Browsers cannot read a historical OneDrive version when Graph omits the preauthenticated download annotation. OneDrive currently allows only the Microsoft-owned host suffixes exercised by the mocked endpoints and documented in README 9.3. Uncertain writes need explicit provider review.
- Validation: The shared provider contracts and additional MSW cases cover the upload thresholds, hash verification, 429 Retry-After, expired auth with pending bytes retained, and refusal to replay an uncertain write. Chromium covers partial push, recoverable delete, retry without duplicates and mixed-provider navigation. The single snapshot refresh passed light, dark and Hindi at 360 px. The one npm run check invocation passed typecheck, then found a lint error in the shell size script. After the lint fix, lint, CSS lint, all 250 tests, production build and the 151886-byte gzip shell check passed individually. The production build contains no mock worker or provider fixture data.


### M4a slice 2: Google Drive (2026-11-20)

- Status: Drive implements the shared suite, drive.file GIS token client, lazy gesture-triggered script, cursor listing, binary/revision reads, normal Shelf folder creation at Push, multipart and chunked resumable upload above 5 MiB, native MD5 metadata and quota.
- Decisions: Never request broad Drive/appData scopes or create storage on Connect. Missing ETag refuses destructive writes; version and ETag are checked before conditional mutation. HTTP 308 is accepted only on allowlisted Drive upload sessions. Uncertain uploads stop without automatic replay.
- Not done: Dropbox, OneDrive and integration follow. M4b is not started. Optional Picker is outside M4a.
- Manual steps: [HUMAN] Register the Google web client and test CORS/ETag exposure, consent, expiry and resumable behavior with a disposable account. Client ID remains unset.
- Known issues: Google-native documents do not expose binary media/MD5; provider errors remain visible. Real-account OAuth and session recovery after tab termination are not claimed. Focused contracts/upload/auth tests, typecheck and scoped lint pass.

### M4a slice 1: provider contracts (2026-11-20)

- Status: Added normalized provider contracts, typed errors, allowlisted HTTP and a reusable MSW contract suite. GitHub passes all 12 assertions alongside existing push/read regression tests (24 tests total); typecheck passes.
- Decisions: Owner instructions authorize M4a only and override the general pre-commit check rule: focused validation per slice, one full check at the end. Amendments 1 to 3 are already merged. M4a/M4b boundaries are explicit in README 14. Completion callbacks must be durable before another sequential write.
- Not done: The remaining four authorized slices follow. M4b is not started.
- Manual steps: Real OAuth client registrations and provider-account checks remain [HUMAN]; no credentials are required for MSW.
- Known issues: Mock tests do not prove provider CORS or consent behavior. GitHub tree enumeration has no cursor; its existing truncation and root pagination behavior remain separately tested.

### M3.5b Office Quick view completed locally (2026-11-20)

- Status: All four authorized slices are implemented. DOCX, XLSX and PPTX render on origin B through a byte-only private MessageChannel. Legacy, corrupt, encrypted, timeout and 50 MB messages retain metadata and Download. M4 remains unstarted.
- Decisions: Honor the owner's focused-test commits and one full-check instruction. Keep the accepted vendored SheetJS and selected renderers; no dependency research or audit was repeated. Use saved formula results, a 5,000-row/256-column cap, virtual rows, sanitized detached document output and app-owned notices. Cloud rendering stays disabled. The PPTX-only lazy chunk has a documented, enforced 400 KiB exception; no shell-budget change. CI audit severity now matches the accepted no-high-or-critical gate.
- Not done: No implementation work remains in M3.5b's authorized local scope. Tier 2/B/C, provider cloud rendering and paid cloud services remain deferred. Production, real-account and device release gates below are not claimed complete.
- Manual steps: Follow docs/manual-test-m3_5b.md. Deploy and verify the different-site sandbox, exact headers and cookie boundary; review real-account/browser/device fidelity, encrypted workbooks, memory, screen readers and Hindi.
- Known issues: Quick view does not recalculate formulas. Advanced Office fidelity, document fonts and pagination can differ. The conservative sanitizer omits SVG slide shapes, active links and embedded HTML. Where source image descriptions are absent, images use file/index identifiers. The renderer and accepted moderate audit findings must be revisited on upgrades.
- Validation: The single npm run check passed with 193 tests, type/lint/CSS checks, production build and a 150686-byte gzip shell. Six focused unit/worker/UI checks and Chromium rendering/control/isolation cases pass. The one snapshot refresh passed three Styleguide cases, producing only light-default, dark-default and hindi-360; all three were visually inspected. Origin-B bundle caps pass. Scoped type/lint and browser checks cover final failure-disposal handling. No test was skipped or deleted, no external account or token was created, and no remote push or deployment was performed.

Historical checkpoints below describe earlier states and are superseded by this entry for M3.5b.

Updated: 2026-11-17 (Asia/Calcutta).

## Status

The approved analysis governs ambiguities except where merged amendments or owner scope decisions override it. M1.5 UI v2, M2 guards, M3 parts A/B and M3c have local implementation with the limits below. M1 real-account verification remains owner-run. M3.5a Website and media preview is implemented locally with mocked Chromium validation; production sandbox deployment is an owner step. M3.5b Office Quick view is implemented locally with the production/manual limits above; M4 is not started. Tier 2, Tier B and Tier C are deferred by owner decision.

| Work | Status | Evidence / next gate |
| --- | --- | --- |
| Planning analysis | Done, approved | docs/ANALYSIS.md |
| M0 Foundation | Done | Tokens, fonts, primitives, Styleguide, contrast/policy checks, snapshots and CI. |
| M1 Shell and GitHub read | Implementation done; real-account verification pending | Full selection/grid, tree/keyboard, PDF reader, Inspector, responsive panes, local preferences and mocked browser tests. Owner follows docs/manual-test-m1.md. |
| M1.5 UI v2 | Done locally | Amendment merged in place; colour roles, command/address rows, navigation groups, revised columns, preview and counts, glyph families, Styleguide and focused accessibility tests. |
| M2 Guards | Implemented locally with documented limits | Guard review, badges, meter and read-only ledger; real-account checks remain pending. |
| M3 Staging and push | Parts A and B implemented locally with documented limits | Durable staging and recovery, creation, destination paths, pinned and guarded quick push, file clipboard commands and shortcut Settings; manual account and native-browser checks pending. |
| M3c Folder operations | Implemented locally; owner account/device checks pending | Complete subtree plans, linked groups, collision choices, guarded folder copy and directory import. README acceptance 43 to 49. |
| M3.5a Website and media preview | Implemented locally; production/device gates pending | Sandbox, static sites, hand-offs and cached media; acceptance 29, 30, 34 and 35. |
| M3.5b Office Quick view | Implemented locally; production/device gates pending | Acceptance 27, renderer fixtures, controls and hostile/token/storage isolation pass locally. Tier 2, B and C are deferred. |
| M4 Other providers and moves | Not started | M3 exit and provider setup required. |
| M5 Library features | Not started | Cache, offline integration, search, collections and alternate views remain here. |
| M6 Platform | Not started | OAuth, hosting, extension, PWA, Settings and Privacy remain here. |
| M7 Release | Not started | Full release, device, screen-reader and language reviews remain here. |

## Decisions

- Owner decision, 2026-11-18: use the supplied SheetJS CE 0.20.3 tarball after SHA-256 verification, with sandbox worker isolation, a 50 MB input cap, 20-second timeout and limited read options. Verify docx-preview and pptx-preview using npm metadata and audit; use the specified PPTX fallback if it fails the stated criteria. Network verification failures are recorded as unverified and do not stop the work.
- M3.5b preparation: the supplied tarball hash matches and it is not ignored. Offline installation succeeded. Registry metadata confirms docx-preview 0.4.1 and pptx-preview 1.0.7 are permissively licensed and published within 24 months. Production-only npm audit reports no high or critical findings and three moderate findings through pptx-preview. The full audit initially stalled on registry timeouts and remains unverified. A sandbox spreadsheet worker and hash, cap and timeout tests are in progress; no Office viewer is wired or security-tested yet. The worker currently limits output to 256 columns as a memory bound and needs a user-visible notice and review before use.

- Owner decision for M3.5b: move all paid cloud Tier P and E work, including broker, vendors, mocks, Turnstile and quotas, to M6 for one implementation with real vendors. README records this override. M4 remains unstarted.
- Historical research (superseded by accepted dependency findings): dependency research was incomplete. On 2026-11-17 the allowed GitHub API reported docx-preview upstream package version 0.4.1 and Apache-2.0, with repository activity in September 2026. The pptx-preview candidate repository reported activity in October 2025 and an unclassified licence; its package version and licence still need verification. The SheetJS GitHub mirror points to a different upstream host, which is not in README 9.3. GitHub advisories list high-severity prototype pollution and ReDoS affecting older npm xlsx releases. ExcelJS is an alternative candidate, but GitHub lists a medium-severity XSS advisory and its suitability and affected versions remain to be checked. No dependency, CSP compatibility, complete advisory review or package integrity is approved by this preliminary research.

### Historical M3.5b research checkpoint

- Status: scope and acceptance text committed; dependency and sandbox spreadsheet worker preparation is uncommitted. Office Quick view is not implemented.
- Decisions: preserve the strict host allowlist and do not install or ship a parser before the requested verification.
- Not done: full dependency audit and CSP review, Office viewer integration, security and fixture tests, translations, specimens, manual checklist, visual review, snapshot refresh and both requested implementation commits.
- Manual steps: production sandbox deployment and existing owner verification gates remain as documented for M3.5a.
- Known issues: the maintained SheetJS upstream is outside the current research allowlist; any change to approved hosts requires an explicit policy decision. The GitHub advisory search alone does not prove that a dependency is safe or compatible with the sandbox CSP.

- M3.5a UI: roots with index.html and candidate docs/dist/build/public folders are detected; package/backend roots without a selected built site get the server hand-off message. Package roots are treated conservatively as needing a build; no dependency installation or engine execution is attempted. HTML selection previews its containing folder. Special tree entries and noncanonical paths refuse the whole preview. Caps apply to the selected virtual root; media uses a separate 100 MiB input limit.
- Hand-off URL verification, 2026-11-17: [StackBlitz official import guide](https://developer.stackblitz.com/guides/integration/open-from-github) documents `https://stackblitz.com/github/OWNER/REPO/tree/BRANCH/PATH`. [GitHub Codespaces official guide](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/setting-up-your-repository/facilitating-quick-creation-and-resumption-of-codespaces) documents `https://codespaces.new/OWNER/REPO/tree/BRANCH`. [GitHub Pages REST](https://docs.github.com/en/rest/pages/pages#get-a-github-pages-site) supplies `html_url` only after GET /repos/{owner}/{repo}/pages succeeds; permission/disabled results hide the action. All path/branch segments are encoded and links use noopener/noreferrer. No hand-off receives a Shelf token or file upload.
- CodeSandbox current-doc exception: the [official repository import source](https://github.com/codesandbox/docs/blob/main/packages/projects-docs/pages/learn/repositories/open-source.mdx) announces no new repository imports after 2026-04-01 and support ending 2026-07-01. Do not use its retired `/p/github/OWNER/REPO` format. The menu instead uses `https://codesandbox.io/s/new`, documented by the [official browser-sandbox overview source](https://github.com/codesandbox/docs/blob/main/packages/projects-docs/pages/learn/browser-sandboxes/overview.mdx), and explains manual import. This is a deliberate current-service limitation, not an unverified automatic importer.
- Media reuses native blob playback and existing Space/arrows/F keys; Quick Look now leaves player keys to the player. Downloads stream progress, reject over 100 MiB before fetching, and cache by ref plus immutable SHA. OPFS bytes and IndexedDB LRU metadata use a separate disposable 500 MiB cache; IndexedDB blobs are the no-OPFS fallback. Storage failures retain playback and show the cache-unavailable notice. General offline-library/cache Settings work remains M5/M6.

- M3.5a first commit: isolated sandbox origin and security only. The bootstrap transfers the private app port into the service worker, then replaces itself with repository code. Its parent is origin A, so repository scripts cannot inspect the parent or remove the app-owned banner. Opaque nested frames were rejected during development because their subresources bypass the virtual-file service worker. Repository workers, child frames, forms, popups and top navigation remain denied by response CSP and iframe permissions.
- Owner scope decision: defer Tier 2 LibreOffice WebAssembly, Tier B WebContainers and Tier C Pyodide, including their engine spikes. README records this override. M3.5b Office/managed mocks and M4 remain unauthorized and unstarted. Amendments 1 to 3 were already merged into README before implementation; source amendment files and the owner's AGENTS.md edits are left untouched.
- External requests default to blocked to enforce hostile-site exfiltration tests. Unblocking will be an explicit toolbar choice with a disclosure. Sessions enforce 500 files and 50 MiB of declared and actual bytes; paths are canonical and reads are limited to the manifest. No runtime dependency was added.

- M3c: source folders use immutable tree SHAs. Recursive responses marked truncated are discarded and each directory is read non-recursively; a truncated or inaccessible child fails the whole operation. Special entries are never silently omitted. Source tree stamps detect newly added upstream files at Push, and replacement stamps protect the whole destination. Expected replacement roots advance only after Shelf's own successful sequential commit.
- Same-repository, same-branch folder Cut/rename reuses blob SHAs and preserves executable modes. Same-repository Copy reuses SHAs; cross-repository Copy reads immutable raw blobs one at a time through durable persistence. No metadata is published until the complete group and its guards succeed. Failed byte materialization can leave unreferenced byte files, as with existing staging; it never publishes a partial pending group.
- Collision choices have no default. Keep both generates a free (shelf copy) sibling name; Replace removes the existing destination subtree, including superseded pending work, in the same undoable stage action. Source folders with existing pending changes must be reviewed/discarded before a remote-subtree operation, preventing silent omission of local work. Filtering Pending retains every member of a linked group.
- Folder imports preserve the top-level directory prefix. Directory readers are drained through every batch, and empty directories get disclosed .gitkeep markers. The cap is 2,000 entries including markers, checked before publication. A directory picker cannot identify an empty root if the browser returns no files; the UI explicitly directs the owner to New folder.
- F2 and Delete now use the remappable registry and respect file-list focus, text editing and open dialogs. Add-only retargeting preserves nested group paths. SHA-only pending copies cannot be retargeted across repositories; copy the original into the intended repository to materialize bytes. Cross-repository or cross-branch Cut remains refused until M4.
- Confirmed the tree truncation/non-recursive fallback and immutable raw-blob endpoint against primary GitHub documentation: [Git trees](https://docs.github.com/en/rest/git/trees), [Git blobs](https://docs.github.com/en/rest/git/blobs). No real-account writes or additional runtime host/dependency were introduced.

- M3b UI: active New repository, New folder, Upload, Rename, Delete, Cut, Copy, Paste and Push controls use durable guard-reviewed staging. New folder uses a disclosed .gitkeep marker. Copy keeps the source and stages read bytes; the same-repository rename rule applies to Cut/Paste. Cross-repository Cut remains refused until M4 verified transfers. Directory-wide clipboard/rename/delete were enabled in M3c.
- Destination changes apply atomically to all pending additions, preserving byte keys and undo history. Mixed plans with existing-file operations cannot be retargeted, to preserve their base versions. Folder and branch suggestions use the provider; new folder paths become commit paths. Home uploads ask for a destination before choosing files, allowing the correct visibility and size guards before staging. A pin applies to later uploads and can be removed by unchecking and applying it.
- Push opens full review on first use, changed destination, public visibility, non-OK guards, sensitive names, unknown preflight or conflicts. Quick push checks the current remote tree before opening and still re-runs every push guard. Public/warning confirmations reset on changed pending work. Destination editing and pending mutations are unavailable while pushing, and cancellation remains available before the ref update. Successful pushes expose commit links.
- New repository uses actual POST authorization as capability detection, private and README defaults, live validation and debounced availability. Owner memberships are candidates subject to server policy, not a promise of creation permission. Creation 422 is not falsely classified as permission or duplicate name when the existing provider abstraction cannot distinguish them. The fallback guide and repository refresh remain available.
- Additional current-doc finding: renaming a default branch needs Contents write and Administration write. The creation endpoint has no branch parameter. Shelf attempts main after initialized creation; after a failed rename it attempts a read to reconcile the actual branch, keeps the created repository and warns if main cannot be confirmed. Turning off README also preserves an uninitialized owner default and warns if different. Source: [rename a branch](https://docs.github.com/en/rest/branches/branches#rename-a-branch). This safely avoids presenting an already-created repository as a failed creation and posting a duplicate.
- Shortcut registry and non-secret persisted remappings live at #/settings/keyboard. Text editing and active dialogs retain their own keys. Duplicate modifier orders and browser/app-reserved combinations are rejected. The default Alt+N/M/P actions retain visible controls. No global command palette or new New menu was implemented; the existing direct buttons and empty-destination creation entry are active, while the palette remains M5.

- M3b research (2026-11-17): GitHub currently lists Administration write OR Repository creation write for POST /user/repos, and the permission matrix lists Repository creation write for both personal and organization creation. Contents write remains needed to push. Creation defaults to public unless private is supplied; auto_init defaults false. There is no default_branch create parameter, so an initialized branch is renamed to main afterward when permitted. Capability is determined by the actual authorized create response; owner membership is not proof of create permission and denied organization listing falls back to the user. github.com/new prefill parameters were not verified and will not be used. Sources: [create repository](https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user), [fine-grained permission matrix](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens#repository-permissions-for-repository-creation). No real repository was created during research.

- M3a UI replaces the M2 Stage placeholder only after guards pass. Working copy rows retain destination owner/repo/branch/folder, base versions, byte keys, verdict and optional linked group. Pending review groups linked changes, supports discard/undo/redo and confirms public/sensitive/large-file risks again at push. History restores run guard review before staging. No M3b creation/destination conveniences or M3.5 work was added.
- Working-copy ZIPs are store-only with CRC checking and a versioned manifest. Persistence is requested on first save and recorded; age warning refreshes every minute, beforeunload warns while pending, and the iOS hint is recorded once in preferences. Cache eviction does not touch staged bytes.
- The size check now follows the build manifest for bootstrap plus Explorer static dependencies instead of summing every lazy feature except named PDF chunks. The 150 KB shell threshold is unchanged, and a separate 250 KB lazy-chunk check is enforced per README section 11.

- M3a core checkpoint: working-copy metadata is committed to IndexedDB only after OPFS bytes close successfully, with IndexedDB byte fallback when OPFS is unavailable. Undo/redo retains referenced bytes for this session. Store-only ZIP backups include the manifest and CRC-checked byte entries. GitHub writes share a one-second mutation scheduler and force-false ref updates; conflicts retain local work. No M3b or M3.5 work is included.

- Documentation merge: verified Amendment 1 content is already incorporated in README sections 5.3, 5.6, 5.7, 5.9, 6.7, 6.16 and 6.17, milestone M1.5 and acceptance 19 to 26. Kept the existing M1.5 rather than duplicating it. Merged Amendments 2 and 3 into 6.5b, 9.3, 9.4, 9.8, 10, 11, 13.4, 14 and acceptance 27 to 42; corrected Amendment 1 cross references to their in-place section numbers. No feature is marked implemented by this documentation update.
- Conflict resolutions: isolated origin B replaces the prior scriptless-only preview for opt-in executable sites, while the existing scriptless implementation may remain until isolation is proven. Origin A retains strict CSP; verified preview, Turnstile and vendor origins are added only to the appropriate policy when enabled. Managed cloud rendering is opt-in and supplements local tiers, and changes the earlier no-third-party-transfer claim: consented bytes go directly to the vendor, never through the metadata-only worker. Tier E extends the earlier hand-off-only option for server-dependent projects; a failed local spike does not remove optional managed tiers, which remain subject to consent, budget and M6 availability. The 100 MB default local-conversion cap and stricter managed per-file cap apply independently. Tier 3 provider rendering waits for M4; M3.5 uses mock paid vendors and M6 wires real adapters. Unverified pricing, host, vendor and licence claims remain explicitly conditional on verification.

- M2 UI uses the pure guards for file, projected repo, batch, visibility and sensitive-name review. U opens the file picker only in the file grid; OS file drops open review without reading/uploading bytes. Confirmations are per-review component state and reset on close. Stage is visibly disabled and labelled M3; no staging store or write API was added. A blocked dialog initially focuses its container, with no default action.
- Size ledger is a right-hand read-only drawer with 50/100 MB reference lines, up to 20 largest files from the current listing, a repo-size meter and segmented threshold bar. This is explicitly labelled as a listing view, not a recursive repository scan. Move/PDF split controls are unavailable until M4; the block review shows a PDF split estimate without performing it. LFS is not offered because no advanced LFS setting/capability exists yet.

- M2 logic uses exact byte thresholds; repository projections include staged additions without deletion credit because Git retains history. Unknown repository size or visibility blocks approval. Batch plans preserve change order and block a change larger than the cap. Public and sensitive-name confirmations are per call and never stored. Invalid byte counts throw rather than silently producing an OK verdict. LFS detection checks the exact first line.

- UI polish completion supersedes the c40ca6f partial checkpoint. Sashes keep persisted widths and now clear drag styling on lost capture. Breadcrumbs edit on Ctrl+L or empty-area click, submit with Enter and revert with Escape. Address history/Up/Refresh and pane toggles use shared outline icons; later actions have focusable aria-disabled buttons with portal tooltips. Connect shows provider rows and opens the PAT form only from GitHub. The guard strip displays reported repository size and presentation tints, without M2 evaluation.

- M1.5: merged README-AMENDMENT-1.md into README sections 5.3, 5.6, 5.7, 5.9, 6.7, 6.16, 14 and 15, adding 6.17 without renumbering existing sections. The amendment source is retained. M3 owns repository creation, destinations/messages/push, clipboard staging and shortcut registration; no write API or guard implementation was added.
- A1 contrast resolution: the exact dark navigation blue cannot meet both white-on-blue and blue-on-selection-tint at 4.5:1. Navigation keeps the specified bright blue; white-on-blue action surfaces use blue-action. The registry tests those roles independently. Dark green is #248837 on #010409 tint. Legacy paper/accent/status tokens map to the new roles for existing readers.
- Existing table preferences with four columns reset to the new five-column schema, preventing old widths from shifting to the wrong columns. New widths, visibility and sorting still persist.
- Six review images only. Default light/dark Styleguide goldens are intentionally refreshed; compact/comfortable cases retain axe and explicit density checks instead of taking additional images. Other old visual baselines were not refreshed in this task.
- Search, Recent, Favorites, Collections, alternate views and write actions remain disabled with milestone explanations. The later polish replaces the visible canonical field with breadcrumbs and moves Up into the address icons. Command Sort focuses the working sort selector rather than duplicating its state.

- UI repair: the high and medium findings in docs/ui-critique.md are addressed through tokens, CSS and presentation markup. Existing handlers, data and dependencies remain in place. The prior matched screenshot matrix is retained; no new capture set was made on resumption.

- The previous partial M1 checkpoint is superseded by this completion. FileTable now supports click/toggle/range/select-all/rectangle selection, type-ahead, virtual rows with the focused row retained, roving focus, sticky headers and persisted sorting/column sizes/visibility per location.
- Locations uses the APG tree pattern with explicit group ownership, arrows, Home/End, type-ahead and sibling expansion. Inspector tabs also follow the APG pattern. Local implementations replaced general Tree/Tabs imports to meet the unchanged bundle budget; modal focus trapping remains React Aria.
- Ctrl/Cmd+L, pane toggles, parent/history keys and Quick Look sibling/open/close keys have visible-control alternatives. Deferred row focus is cancelled or avoided when the row already exists, preventing a modal focus race. Skip links, polite selection updates and assertive errors are present.
- PDF uses a local matching PDF.js worker, canvas plus selectable text, single/continuous modes, fit width/page, 25 to 400 percent zoom, thumbnails, internal outline, phrase highlights/next/previous, keyboard shortcuts and per-file page/zoom/mode. Distant canvases/text layers and page resources are released. PDF document actions/scripts are never invoked. The obsolete isEvalSupported option was removed; it is not claimed as a security control in PDF.js 6.
- IndexedDB stores only non-secret table layouts, pane widths and reading preferences. Tokens stay only in module memory. Storage failure falls back to session defaults; it does not block reading. Remembered token encryption and cache/wipe behavior are not implemented early.
- Responsive defaults follow all four width bands. Mobile uses a Locations drawer, Inspector sheet, two-line rows, sticky Pending line and long-press selection with read actions. Touch movement cancels long-press; file drag/drop mutations are absent.
- Inspector has Preview and Details, exact known byte totals, ref/hash copy, metadata, visibility and cache status. Full-viewer Details is the default; its Preview reuses loaded bytes. Unknown metadata is labelled rather than fabricated. Guard copy is descriptive only; actual verdicts remain M2 and History remains M3.
- GitHub last-change metadata is fetched for visible rows and cached briefly in bounded RAM. No recursive tree is trusted after truncation. Symlinks/submodules remain read-only special entries. No write API is exposed.
- Closed the earlier image/code/Markdown gaps: image fit/100 percent/zoom/pan/sibling keys, code line numbers/wrap/copy, same-provider relative links and image blobs, and common viewer actions/help. The approved analysis P14 also places CSV/media/HTML baseline reading in M1, so those readers are included.
- Security takes precedence over HTML's requested script execution. Run preview is opaque and scriptless, with scripts, forms and network resources denied. The UI explicitly says so. This is a deliberate deviation from executing scripts in an isolated frame.
- Bounded text previews stop at 10 MiB and relative Markdown images at ten per document. Above 2 MiB, code uses plain text. Download remains available. These safety limits are explicit in HELP.md; they are additional limits beyond README 6.5.
- Viewer controls reflow with the shared shell instead of forcing every action into one fixed 40px toolbar. Pane resizing now uses accessible sashes (this supersedes the earlier slider deviation). Table dividers do support drag and keyboard resizing. These are remaining presentation differences, not hidden functionality claims.
- All new composites and reader specimens are in the development/test Styleguide. Samples are labelled and excluded from production. Fonts remain self-hosted. No dependency, runtime host, credential mode, budget exception or subsequent milestone was added.

## Not done

M3.5a implementation is complete locally. Production deployment, real-account media near 100 MiB, Firefox/WebKit, physical-device memory, NVDA/VoiceOver and fluent Hindi review remain owner steps in docs/manual-test-m3_5a.md. Tier 2/B/C, M3.5b and M4 remain unstarted. CodeSandbox automatic repository import is unavailable in the official current service; the menu opens its documented blank browser sandbox with an explanation.

M3c real-account and native OS directory-drop verification are owner-run. Repository/branch changes involving Cut remain M4. Cross-repository Git LFS pointer copying is refused to avoid orphaning LFS data. Unsupported symlinks/submodules fail the entire operation. No M3.5 work was started.

M3b manual real-account checks, native browser menus, Firefox, screen readers and physical devices are not verified. Directory-wide operations are implemented in M3c; cross-repository Cut remains disabled. Destination retargeting is limited to add-only plans. Owner and branch suggestions currently cover the first 100 API results; an exact branch/repository can still be entered. Historical Styleguide goldens were reviewed and intentionally refreshed in the validation recovery task. The initial full-suite failure count and subsequent targeted results are recorded below. No M3.5 work was started.

M3a limitations: protected branches fail safely and retain work, with recovery branch creation/retargeting still manual; background listing refresh does not yet mark conflicts before Push. No real account, physical-device memory or browser matrix result is claimed. ZIP64/streaming large backups are not supported; classic ZIP export refuses over-limit archives. Undo retains unreferenced staged byte files for session safety; garbage collection is deferred. M3b local implementation is described below. M3.5 remains unstarted.

The M3.5a sandbox and static/media UI are implemented. The broker, managed vendor adapters and cost controls remain future work in M3.5b/M6. Older checkpoint notes below describe historical scope, not the current M3.5a status.

M2 review UI is implemented. Repository-wide recursive largest-file enumeration remains outstanding; the ledger explicitly limits its claim to the current listing. Actual staging and push remain M3, and transfers/splitting remain M4.

M1.5 does not activate M3 shortcuts or M5 search/views/collections. Chrome/Edge/Firefox shortcut conflict checks belong to M3 and are unverified here. Older non-default visual baselines outside the focused suite are retained, not claimed as current v2 evidence.

UI Grid view remains scheduled for M5. Saved column widths may require horizontal table scrolling. Independent visual and device review remains open.

| Item | Reason / next gate |
| --- | --- |
| Real GitHub account, actual 20 MB/50-page document and deep-link exit verification | Owner must supply a disposable repo/PAT through the app. Checklist is docs/manual-test-m1.md. Mock fixtures are not real-account evidence. |
| Independent browser-menu zoom, mid-range phone 10,000-row/60fps and memory measurements | Automated virtualization/reflow checks do not prove physical-device performance. Release/device gate remains pending. |
| NVDA/VoiceOver, fluent Hindi review and full Firefox/WebKit matrix | Manual/release gates; local Chromium and axe are not WCAG certification. |
| Remote CI execution | Workflow exists, but no Git remote is configured. No push/deployment was performed. |
| Guard UI, staging, History, push, backup, cache/offline reload, other providers and alternate views | Assigned to M2 through M6; deliberately not started. |
| Script-enabled HTML preview | Disabled under the stronger security policy; documented deviation. |

## Manual steps

[HUMAN] M3c: use a disposable GitHub repository and short-lived Contents read/write token. Rename and delete a three-file folder, verify the single commit and blob SHA reuse, Undo/Redo and group discard. Copy to a second disposable repository and inspect bytes, public/sensitive confirmations and collision choices. Try a native OS directory drop, the directory picker, an empty folder and a folder over 2,000 files in your browsers. Verify case-only names and an upstream added file. Revoke tokens afterward; no real-account verification is claimed here.

[HUMAN] Follow docs/manual-test-m3b.md with disposable repositories and short-lived fine-grained tokens. Use the recommended selected-repository Contents read/write preset for reading and push; add authorized Repository creation write or Administration write only when creation is needed. For a non-main owner default, branch rename additionally needs Contents write and Administration write. Organization approval/resource coverage is owner-managed. Test Firefox and native Chrome/Edge menus; revoke tokens after inspection. No token, OAuth app or secret needs to be committed.

[HUMAN] Follow docs/manual-test-m3a.md using an initialized disposable repository and a short-lived Contents read/write token. Confirm atomic commit, conflicts, protected branches, history and ZIP recovery. Never share the token in chat.

### SETUP: Preview Plus and optional managed rendering

[HUMAN] M3.5a: create a second Cloudflare Pages project using `npm ci && npm run sandbox:build`, output `sandbox/dist`, and exact `SHELF_APP_ORIGIN`. Build Shelf with `VITE_SANDBOX_ORIGIN` set to the deployed sandbox origin. Use a different registrable site, verify Pages public-suffix/cookie isolation if using pages.dev, and verify deployed CSP/frame-ancestors/COOP/COEP. See sandbox/README.md. For local dev run app at 127.0.0.1:5173 and sandbox at 127.0.0.1:5174. No secrets belong in the sandbox.

[HUMAN] Create a second static deployment on a verified different registrable site; configure origin B COOP, COEP, CSP and frame-ancestors, and the app origin allowlist. Verify the host site boundary.

[HUMAN] For optional managed tiers, create a CloudConvert account and API key and a CodeSandbox account and SDK key, using free tiers first. Create a Cloudflare Turnstile site key. Set Worker secrets, budget variables and kill switch, configure billing alerts at both vendors, and document the monthly ceiling in docs/costs.md. Do not commit secrets. These steps are for M6; M3.5 uses mocks.

[HUMAN] Review docs/m2 captures and verify U/file drops with disposable local files. No bytes are staged or sent. Follow the existing real-account M1 checklist separately.

[HUMAN] No setup is required for the pure guard functions. Review and authorize the remaining M2 guard UI separately.

[HUMAN] Review the four docs/polish images and try pane resizing, breadcrumb editing and first-run Connect. No new account setup is needed. M2 remains unstarted.

[HUMAN] Review docs/m15 and the M1.5 notes in docs/design-qa.md. Approve M2 separately. Real GitHub verification remains in docs/manual-test-m1.md; sample screenshots do not establish it.

[HUMAN] Review docs/ui-comparison.md and docs/ui-critique.md, including the light and dark repaired screens. Perform browser-menu zoom and physical-device review separately.

[HUMAN] Follow docs/manual-test-m1.md with a throwaway initialized repo and short-lived fine-grained PAT. Verify public/private browsing, a real PDF, page/zoom persistence after reconnection, deep links, keyboard and mobile width. Never send the token in chat or commit it. Revoke it afterward and record the result without credentials.

[HUMAN] Review the new Explorer/Inspector/PDF/360px captures and intentional Styleguide baselines in docs/design-qa.md. Review the bounded-preview and scriptless-HTML choices above. Configure a Git remote if CI should run remotely. Authorize M2 separately when ready.

## Known issues and limits

- M3.5a static preview cannot build source projects or run servers. Some HTTPS resources still fail COEP even with external requests enabled. Diagnostic text is advisory output from repository code; the external request policy and app-owned banner do not depend on it. The runtime origin check is conservative for multi-part public suffixes other than pages.dev; use clearly different registrable domains and verify deployment independently.

- M3.5a: production host boundaries and deployed headers require owner verification. Diagnostics from repository scripts are advisory and bounded. Chromium is the local security proof; Firefox/WebKit, physical media codecs and production accounts remain manual gates.

- M3c: a changed source/replacement tree requires discarding and restaging the complete folder. Per-file conflict choices cannot waive the subtree completeness check. SHA-only copies redirected to another repository must be recreated from the original selection. Existing first-100 repository/branch suggestion limits, physical-device performance and native browser/OS checks remain. OS directory drops operate in an open repository; the library-home Upload folder action asks for a destination first.

- M3b browser record: Chrome 157.0.8103.78 and Edge 157.0.4341.60 passed automated headless Alt+N/M/P delivery. This does not verify native browser menu conflicts. Firefox was not found in the standard Program Files or per-user installation paths, so its check is unverified. See docs/m3b-browser-checks.json and the owner checklist.
- Repository creation with a non-main owner default can require broader branch-rename permission than creation itself. Unknown or refused branch normalization produces a warning and retains the created repository; refresh before retrying a creation after an uncertain network result. No real account was used.

- History currently lists the API default page of recent commits. Branch recovery after protection rejection remains manual. Partial sequential push success can leave earlier batches on GitHub while pending work is retained after a later failure; inspect GitHub before retrying. No silent force push is used.

- Vendor prices, retention, licences, browser support, host site boundaries, CSP hosts and cloud preview permissions are unverified until the required spikes and adapter research. M2 recursive-ledger scope remains open.

- Ledger largest-files scope is the current listing, not the whole repository. Unknown repo size blocks approval. No real-account verification is claimed. Stage now persists bytes and metadata after guard approval; real-account checks remain owner-run.

- Guard functions are connected to review, staging and push revalidation. Repo estimates use GitHub reported KB and may lag.

- Four new review captures are in docs/polish. Focused Chromium tests cover persistence, keyboard and pointer sash behavior, narrow panes, breadcrumbs and disabled tooltips; independent device and screen-reader review remain pending.

- A1's dark white-on-blue requirement needs a separate action fill role; README records this numerical incompatibility. Native selects and media controls retain platform appearance. Breadcrumb editing continues to use the canonical ref.

- Native controls retain browser/platform styling. A prior full Playwright run reported a light Styleguide tooltip focus timeout; this is recorded pending verification, without claiming the full suite passed for this repair.

- Real provider CORS/large-file/font/codec combinations remain unverified until the checklist is run. Password-protected, damaged or unsupported PDFs show an error plus Download; no password prompt is implemented.
- GitHub per-item commit metadata can consume API quota. Only mounted rows request it, results are briefly cached, and unavailable metadata stays Unknown. Deep-link metadata failure does not discard successfully loaded bytes.
- Preferences are optional and can be removed by private browsing/storage clearing. A branch/path key intentionally follows that file across content updates. No offline file-byte cache is claimed.
- The jsx-a11y ESLint peer override and TypeScript/minimatch compatibility choices from M0 remain documented in docs/dependencies.md. No new packages were installed.
- Screenshot baselines depend on Windows Chromium. Changes were reviewed locally; independent owner visual approval remains pending.

## Validation

M3b core commit 238579a passed npm run check with 145 tests. Focused MSW unit/component tests cover each automatic-message table row, Unicode truncation, private/public creation, permission refusal, branch-rename refusal, copy/rename plans, atomic retargeting, shortcut parsing and locale parity. Focused Chromium flows cover acceptance 19 to 24, public/warn/block/conflict quick exclusions, pinning and commit links. Chrome/Edge key-delivery results and the unverified Firefox check are recorded for acceptance 26. Integrated npm run check passed with 161 tests and a 149266-byte gzip shell. The five focused browser cases passed. The initial full browser audit ran all 39 cases: 25 passed and 14 failed. Targeted repairs and reruns cover the failed cases; details are recorded in the validation recovery note below.

M2 guard logic: file, repo, batch, public visibility, sensitive-name and LFS boundary tests plus en/hi key parity; see tests/guards.test.ts. npm run check passed with 128 tests and a 149311-byte gzip shell.

M1.5: npm run check passes with 84 tests (including both A1 semantic registries), typecheck, lint, CSS policy, production build and a 142053-byte gzip shell under the unchanged budget. Nine focused Chromium cases pass: three Explorer width/theme flows and six Styleguide theme/density accessibility cases. Two default Styleguide goldens were intentionally refreshed. Six unique review images are linked in design QA. The full historical browser suite and cross-browser shortcut matrix are not claimed as verified.

UI repair: npm run check passed on 2026-11-17 (117 tests, typecheck, lint, CSS policy, build and 140302-byte gzip shell). The previous full browser run had one Styleguide tooltip visibility timeout; its full-suite result is not claimed as passing. See docs/design-qa.md for visual evidence and review limits.

Local completion results: npm run check passes with 117 unit/component checks, type/lint/style/contrast/policy checks, production build and the unchanged 153,600-byte gzip shell limit. The full 25-scenario Chromium suite passed without snapshot updates. Subsequent focused mobile PDF runs passed after strengthening render-completion, pixel, visible-text and focus assertions. The fixed-date Hindi/360px baseline was also verified. npm audit found zero vulnerabilities and the locked-licence check passed. No test was skipped or deleted to get green. Acceptance 5, the M1 portion of 11/13/14/15/16/18, and the read-only exit flow are covered locally. Acceptance 8's offline reload is M5 and is not claimed by merely remembering a page.

Completion QA note: narrow/short-height PDFs start with a collapsible controls disclosure so document pages retain usable space. The / shortcut opens search; fit actions collapse controls on those viewports. At short desktop heights the shared chrome becomes compact without hiding controls or bottom status bands.

Final evidence: Windows Chromium screenshots for selection/Inspector, PDF, 360px list/sheet/PDF, grayscale, squint and 200% layout are in docs/design-qa.md. No real-account or physical-device verification is claimed. A conventional local commit completes this task; no remote push or M2 work.

Historical c40ca6f checkpoint validation: npm run check passes with 85 tests and a 142456-byte gzip shell. No browser results or screenshot review are claimed for this checkpoint.

Completed UI polish validation: npm run check passes with 85 tests, type/lint/CSS checks, production build and 148518-byte gzip shell under the unchanged budget. Three focused Chromium cases pass, including light/dark Styleguide axe and the shell interaction flow. Four review images are in docs/polish. The full historical browser snapshot suite was not run or refreshed. M2 remains unstarted.

M2 UI validation: npm run check passes with 130 tests and a 153416-byte gzip shell (below 153600). Two focused Chromium/axe guard flows pass in light and dark. Six review images are retained. The recursive-ledger scope deviation remains open; no real-account or M3 result is claimed.

M3a validation: core commit 5336e63 passed npm run check with 133 tests. Final integrated check passes with 139 tests, type/lint/CSS checks, build and 148658-byte gzip static Explorer shell. The focused Chromium/MSW-backed flow verifies durable reload, ZIP export/discard/restore, one commit for three uploads plus a deletion, and explicit upstream-conflict gating; Pending/conflict axe checks pass. Four light/dark review captures are in docs/m3a. No real-account result is claimed.


### M3b validation recovery

- Verified the normalized shortcut parser, canonical modifier ordering, reserved-key regex and en/hi Help paragraphs. Added dedicated shortcuts tests; all 30 focused unit/component checks pass. No features or M3.5 work were added.
- Initial full browser run: 25 passed, 14 failed. Fixed stale M3-disabled assertions to exercise the still-disabled M5 View control; scoped Address and Push locators; supplied fresh repository metadata in MSW. Repaired accessible names on narrow command buttons, hover glyph-label contrast, wrapping repository meters and command-bar zoom overflow. Keyboard focus tests now enter keyboard modality before checking focus-only tooltips.
- Subsequent targeted reruns: six guard/library/polish/staging cases pass; all three M1.5 cases pass; nine Styleguide cases pass, and the Hindi reflow/forced-colors/200-percent case also passes after the final zoom repair. The five focused M3b/Chrome/Edge cases passed. No test was deleted or skipped. A second complete 39-case run was not performed.
- Intentional baselines updated: e2e/snapshots/light-default.png, dark-default.png, hindi-360.png, tooltip-light.png and tooltip-dark.png. Reviewed diffs reflect M1.5 glyph/chrome changes, M2 guard/ledger specimens, M3 pending/conflict/destination/shortcut specimens and corresponding layout height. Other baselines were unchanged. Incidental historical docs captures from running tests were restored; the six M3b review images remain.
- Remaining limits: no real-account verification, native browser-menu conflict check, Firefox executable, screen-reader or physical-device result is claimed. Add-only destination retargeting, file-only clipboard commands, first-100 suggestions and cross-repository Cut restrictions remain as documented. AGENTS.md and untracked amendment files were left untouched.

Final recovery validation: npm run check passes with 161 tests, typecheck, lint, CSS policy, build and a 149269-byte gzip shell. All 14 initially failing browser cases passed in subsequent targeted runs; no known browser failure remains from this audit. The complete suite was run once (initially 25/39), not repeated as a single final run. Focused unit coverage is 30 tests across the six requested files, and all five focused M3b/browser cases passed.


### M3c validation

- npm run check passes with 178 tests, typecheck, lint, CSS policy, production build and a 149328-byte gzip shell. The first check caught two legacy Boolean error assignments in HomeUpload; both were corrected before the passing run.
- Focused development coverage: 34 unit/component tests across folder planning, staging, push, guard review, shortcut parsing and existing M3b UI. Folder-specific MSW cases include rename/delete, zero-blob SHA reuse, cross-repository file limits and LFS refusal, 500 MB sequential replacement copies, truncated-tree fallback during planning and push, collision choices, group undo, empty markers, all directory-reader batches and the over-cap rejection.
- Four folder browser flows pass, covering F2 rename, linked Pending/Undo/Redo, one atomic commit and zero blob uploads, Keep both/Replace/Cancel, OS entry enumeration over the cap, directory-picker prefixes, axe and Hindi/light/dark reflow. All ten Styleguide cases pass, including three densities, forced colors and 200 percent simulation. The full historical browser suite was not rerun. No tests were skipped or deleted.
- Playwright goldens were updated in one final update run, only for intentional changes: light-default.png, dark-default.png, hindi-360.png, tooltip-light.png and tooltip-dark.png. Changes are the Upload folder command, the F2/Delete shortcut rows and folder group/collision specimens. Three final sample review captures are retained in docs/m3c; incidental historical docs captures were restored. No real-account verification or M3.5 work is claimed.

### M3.5a sandbox and security checkpoint

- Status: first requested commit implemented. Three protocol/policy tests and the Chromium hostile-site/message inspection pass. `npm run check` passes with 181 tests and the unchanged 149328-byte gzip shell. An initial check stopped in typecheck on overloaded test instrumentation; Proxy wrappers corrected it before the passing run. No screenshots or snapshots were taken.
- Decisions: 256-bit channel IDs, exact source/origin checks, private app-to-SW port, manifest-only reads, strict MIME/CSP, SPA fallback and virtual absolute paths. Stop disposal and abort are wired in the app transport. The sandbox build emits its own deployment headers.
- Not done: app UI, hand-off research integration, media cache and manual checklist follow in the second commit. Deferred Tier 2/B/C and M3.5b/M4 remain unstarted.
- Manual steps: second Pages deployment and verification are listed in SETUP above and sandbox/README.md. No account or secret was created.
- Known issues: production site-boundary/header and non-Chromium/device checks remain unverified; strict mode is the tested security default.

### M3.5a UI and final validation

- Status: Website and media preview is implemented locally. First commit 579a3f2 contains the sandbox/protocol/security checkpoint; the second requested commit contains site controls, hand-offs, media progress/cancellation/cache, locales, specimens and deployment/manual docs. M3.5b and M4 are not started.
- Validation: the second commit's single `npm run check` passes with 186 unit/component tests, type/lint/CSS/build checks and a 150094-byte gzip production shell under the unchanged 153600-byte cap. The first commit's passing check had 181 tests; its initial typecheck-only interruption is recorded above. No tests were skipped or deleted.
- Focused browser results across development/final runs: six new cases pass for the integrated static-site controls and actual provider-token message/network audit; audio/video blob playback and OPFS reuse across reload; Hindi light/dark specimens and axe; blocked foreign embedding; hostile escape attempts; and cancelling media before bytes arrive. The existing CSV/inert-HTML/native-media regression also passes after its fixture gained immutable audio blob metadata. Stop is verified by removing the frame and receiving HTTP 410 when the stopped session is probed.
- Snapshots were refreshed once, at the end: light-default, dark-default and hindi-360. The same run's existing 200-percent reflow capture is the fourth and final screenshot. All three Styleguide tests pass, including axe/forced-colors/reflow. No further screenshot run was made; tooltip and other historical goldens were unchanged. See docs/design-qa.md.
- Decisions: static file reads are streamed and bounded against the immutable manifest before bytes cross the private port; virtual responses also restrict frame-ancestors to the exact app origin. App deployment headers are generated into dist/_headers. Console and request diagnostics are bounded to 200 entries. Native media retains playback when caching is unavailable and exposes a Cancel download action while bytes are arriving.
- Not done: production hosting/site-boundary/header validation, real-account/near-100-MiB/device/codec/browser/screen-reader/Hindi review remain owner release gates, not claimed results. CodeSandbox automatic repository imports are retired; the documented /s/new manual-import fallback and explanation are implemented. General offline library, cache Settings/Wipe, Office/managed render and deferred Tier 2/B/C engines were not added.
- Manual steps: follow docs/manual-test-m3_5a.md and the [HUMAN] SETUP entry above for the second Cloudflare Pages project. Both projects build locally; no deployment, external account, secret or remote push was performed.
- Known issues: source package/backend roots need built static output or an external hand-off. COEP can reject third-party resources even when the external toggle is off. The strict-mode hostile-site guarantee is the tested default; turning external requests on explicitly permits repository content to leave the preview. Cache remains disposable browser storage. The owner's AGENTS.md change and untracked amendment source files remain untouched.

Final review note: diagnostics injection now preserves an existing HTML doctype, keeping static sites in standards mode. The protocol/policy tests and complete site-control browser case pass after this correction, including a CSS1Compat assertion; scoped lint passes. No additional screenshot or full check run was needed. All M3.5a code is committed in the requested two steps; production/manual gates remain as listed above.

### M3.5b slice 1: DOCX (2026-11-20)

- Status: Implemented isolated Office entry page, byte-only private MessageChannel transport and DOCX rendering with docx-preview; fixture text, table and image render test passes. Typecheck passes.
- Decisions: The owner's slice instructions override the general pre-commit full-check rule: focused tests per slice, one full npm run check in slice 4. Accepted dependencies/audit were not researched again. Render alt chunks and document fonts are disabled; detached output is sanitized before display under a script-restricting CSP. Existing amendments were already merged as recorded above.
- Not done: XLSX, PPTX, isolation browser proof and toolbar polish follow in the remaining authorized slices. M4 remains unstarted.
- Manual steps: Production origin deployment and real-account/device verification remain owner steps.
- Known issues: DOCX pagination and fonts can differ from desktop Word. Download remains in the app toolbar for every error and legacy type.

### M3.5b slice 2: XLSX (2026-11-20)

- Status: Wired the existing SheetJS worker to Office Quick view, with sheet tabs and a virtual table bounded to 50 mounted rows. The two-sheet fixture includes a formula with a saved result. Three focused worker/fixture tests and typecheck pass.
- Decisions: Display saved formula results without recalculation. The existing 5,000-row/256-column cap is disclosed when truncated; table cells use textContent and never interpret workbook HTML or links.
- Not done: PPTX, browser isolation proof and final UI follow in slices 3 and 4. M4 remains unstarted.
- Manual steps: Verify a real encrypted workbook and large workbook on target devices during owner acceptance.
- Known issues: Missing/stale cached formula results reflect the original workbook; Quick view does not calculate formulas.

### M3.5b slice 3: PPTX and isolation (2026-11-20)

- Status: pptx-preview renders the two-slide/image fixture on origin B. Focused Chromium fixture and hostile-document tests pass; typecheck and scoped lint pass. DOCX/XLSX/PPTX open without disk downloads.
- Decisions: PPTX output is sanitized while detached; scripts, frames, forms, SVG and active links are removed. The fidelity notice names animations, transitions, charts, SmartArt and speaker notes. Legacy PPT uses the metadata/Download fallback. The hostile DOCX includes a JavaScript parent probe and an HTML altChunk with a script/exfiltration attempt; altChunks are disabled and links sanitized.
- Not done: Final toolbar, specimens, acceptance/manual documentation and the single full check remain in slice 4. M4 remains unstarted.
- Manual steps: Production separate-site headers and browser/device/real-account checks remain owner gates.
- Known issues: SVG-based slide shapes and advanced presentation features can be omitted by the conservative sanitizer. The fixture initially lacked required OOXML content-type declarations; corrected fixture passes the renderer test. No dependency or audit research was repeated.

### M4a slice 2 completion (2026-11-22)

- Status: Drive deletes now move items to Trash and moves use metadata parent updates. A 401 clears the in-memory credential and auth state.
- Decisions: Keep the first-write Shelf folder and existing upload thresholds. Google documents multipart through 5 MB and 308 with Range during a resumable upload. [Drive upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- Not done: Dropbox, OneDrive and integration follow.
- Manual steps: [HUMAN] Verify Drive CORS, access to conditional request headers and resumable responses in a real browser session.
- Known issues: Lost write responses leave work staged for review. No new network host was introduced.

### M4a slice 3: Dropbox (2026-11-22)

- Status: Dropbox implements PKCE with offline refresh, App folder listing, versioned reads and writes, session upload, history, native content hash and recoverable deletion.
- Decisions: Keep refresh tokens and the PKCE verifier in memory. The same-origin callback delivers the code over a state-specific BroadcastChannel. The OAuth guide confirms App folder isolation, PKCE and offline refresh. Dropbox specifies SHA-256 over concatenated binary hashes of 4 MiB blocks. [OAuth](https://docs.dropboxapi.com/dropbox-api/docs/oauth) [Content hash](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash)
- Not done: OneDrive and integration follow.
- Manual steps: [HUMAN] Register the Dropbox app and authorize the exact /dropbox-callback.html redirect.
- Known issues: Real OAuth and account-specific Dropbox limits remain unverified. No new app network host was required.

### M4a slice 4: OneDrive (2026-11-22)

- Status: OneDrive implements MSAL with in-memory tokens, app-root pagination, eTags, versions, recoverable deletion, Graph upload sessions, quota and byte verification.
- Decisions: Microsoft documents a separate MSAL redirect bridge without COOP. The main page permits OAuth popups. Browser reads use the signed download annotation to avoid authenticated CORS redirects. Microsoft documents signed hosts under files.1drv.com and up.1drv.com, used without bearer headers. The runtime and CSP allow those suffixes. [MSAL bridge](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge) [Download](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content) [Upload session](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession) [QuickXor](https://learn.microsoft.com/en-us/onedrive/developer/code-snippets/quickxorhash)
- Not done: Integration follows. Live tenant download and upload domains were not observed because validation is MSW-only.
- Manual steps: [HUMAN] Verify work and personal account scopes, version download annotations, quota visibility and any tenant-specific signed hosts. The allowlist fails closed on other hosts.
- Known issues: If Graph omits the version download annotation, browser historical download reports an error. Graph may provision the app folder when first accessed. No live provider was contacted.
