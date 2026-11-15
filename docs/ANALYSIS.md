# Shelf implementation analysis

Prepared 2026-11-15 (Asia/Calcutta). Planning only. README.md and AGENTS.md remain unchanged. No product implementation, dependency installation, account changes, or milestone completion is implied by this document.

README precedence is guards (8), security (9), UI (5 and 6), then other sections. Resolutions below are proposals for approval, not silent amendments to the source of truth. This task's explicit request for online verification authorizes research against npm and official documentation; it does not expand the application's runtime host allowlist. The explicit request for a token draft authorizes literal color values in the documentation example only.

## 1. Contradictions, gaps, and proposed resolutions

### 1.1 Numbering and references

Top-level sections run consecutively from 0 through 19. Subsections are consecutive within sections 1, 4, 5, 6, 7, 8, 9, 10, 13, and 17. Section 15 contains exactly 18 numbered acceptance criteria. No duplicate or missing numbered heading was found.

| Location | Finding | Proposed resolution |
| --- | --- | --- |
| 5.9 | Mobile layout points to 7.3, which is internationalisation. | Reference 7.2. |
| 8.8 pointing to 10.2 | Upload thresholds are only partly specified: Dropbox says small/large without numbers. | Define adapter-specific transport thresholds in 10.2, distinct from provider file-size limits. Proposed Dropbox threshold: use sessions above 8 MiB, with 8 MiB sequential chunks. |
| 13.4 and 6.1 | `/privacy` is required, but only hash routes are defined. | Generate a static `/privacy/index.html` from the same reviewed privacy content as `#/settings/privacy`; configure and test `/privacy` on the chosen host. |
| 14 M0 and 5.11 | `/styleguide` versus `#/styleguide`. | Use `#/styleguide`, available only in development/test builds. |
| 13.4 and 9.2 | GitHub callback `<origin>/#/auth/github` is not in the route table and mixes hash navigation with OAuth callbacks. | Use a real, same-origin `/auth/github/` callback page, scrub transient query parameters immediately, then return to the saved hash route. Register the exact callback. |
| 13.2 and 5.11 | Layout omits Select and Checkbox from the primitive directory sketch. | Treat 5.11 as authoritative; include both. Directory sketches are illustrative, not exhaustive. |
| 18 versus 13.1 and 14 | MIT, extension inclusion, and worker hosting are open questions despite earlier decisions. | MIT and the M6 extension remain planned. Assume each deployer owns its Worker; final name/domain and distribution decisions are release tasks. |

### 1.2 Guards and remote mutation semantics

| ID / sections | Contradiction or missing rule | Proposed resolution |
| --- | --- | --- |
| G1: 1, 4, 6.7, 8.4, 10.3 | One Push/one atomic commit conflicts with the 500 MiB batch cap, multiple repositories, and empty-repo initialization. | Promise one commit per repository/branch batch up to 500 MiB. Show all sequential commits and partial-success boundaries before Push. Never describe a multi-repository or split push as atomic. |
| G2: 10.3, acceptance 6 | Contents API initialization creates a visible commit before the regular batch. | Offer an explicit initialization plan only during Push. A one-file initial batch can be one Contents commit; a multi-file initial batch discloses the bootstrap plus remaining commit(s). Acceptance 6 uses an already initialized repo. Alternatively the owner initializes a README first. Do not silently manufacture a commit on Connect. |
| G3: 8.2 versus 5.9 | Blocking starts at 95 MiB, but the weight rule stays warning-colored until 100. | Preserve a 100 MiB axis, add a 95 MiB stop tick, and show danger at 95 and above. Guard semantics win. |
| G4: 1.1, 6.9, 7.3, 8.1 | MB/GiB wording and inclusive/exclusive 100 MB claims vary. | Compare integer bytes against the 25/50/95 MiB constants. Keep the required public 100 MB sentence; expose exact bytes and binary-unit explanation in Details/Help. Test byte boundaries, not rounded labels. |
| G5: 8.3, 6.10 | Subtracting deletions in projected repo size suggests history shrinks. | Guard estimate is reported size plus conservative new blob bytes, with zero deletion credit. Tray net-size delta remains a separate working-tree measure. Deduplication may reduce the estimate only when proven. |
| G6: 8.3, 6.7 | Push disabled for every block conflicts with the >=5 GiB override. | Only the repo-size block is overrideable; record a per-attempt acknowledgement and explanation. File-size, visibility, auth, and unsafe-operation blocks are never bypassed. Reset after target/plan changes. |
| G7: 8.10 | Repo tests use 4999 and 5120 MB, missing the immediately adjacent 5 GiB boundary. | Retain those fixtures and add 5119/5120 MiB plus exact threshold-minus-one-byte tests at every threshold. |
| G8: 8.4 | Concurrency two plus a second between mutations is underspecified. | One shared scheduler starts mutations at least one second apart, with at most two in flight; ref updates and commit parts are serialized. Honor server retry timing. |
| G9: 4.1, 6.7, 10.3 | No branch UI conflicts with a branch selector and protected-branch recovery. | Permit only target selection and explicit creation of a recovery branch inside Push. No general branch management or merge UI. Re-run guards and show the new target. |
| G10: 8.5 | Repo creation is required by a guard but lacks a UI, permission model, milestone, or staged operation. | Add a minimal M3 create-location plan, private by default, executed only through Push. Preflight actual account permission; do not broaden PAT permissions silently. If creation cannot be authorized, give provider-side creation steps. |
| G11: 8.6, 10.3 | Advanced LFS write behavior has no transport, auth, CORS, verification, or host design. | M2 recognizes pointers and explains the toggle; M4 owns a feasibility gate for an actual LFS adapter. Refuse writes unless configuration and transport are verified. If unavailable, record the advanced write path as unfinished rather than claiming a full release. Current free-plan 10 GiB figures are confirmed, but must be dated. [GitHub LFS billing](https://docs.github.com/en/billing/concepts/product-billing/git-lfs). |
| G12: 6.11 versus 10.10 | Read-back SHA-256 is mandatory in UI requirements, while architecture allows native-hash-only verification. | Follow 6.11: pin source bytes/version, read back the destination, compare SHA-256, then recheck source version before deletion. Native hashes can supplement, not replace, the required read-back. |
| G13: 6.7, 6.11, 10.5 | A cross-provider move cannot belong to two independently pushable provider batches. Recovery after target success/source failure is unspecified. | A linked transfer is one reviewable operation with target and source consent. Persist copied, verified, delete-pending, and completed checkpoints. The source delete is never independently runnable before verification. Retry only the unfinished leg. |
| G14: 5.10 versus 6.15 | Offline copy implies automatic push, while reconnect push is opt-in. | Default copy: reconnect, review, then Push. Queue only a batch the user explicitly authorized while online/offline. Revalidate bytes, visibility, target, auth, and conflicts after reconnect; changed plans require fresh consent. Never retain the public checkbox across new push attempts. |
| G15: 4, 6.13, 9.2 | App-folder provisioning, roaming collection writes, and OAuth setup may create remote state before Push. | Stage Drive folder provisioning and `.shelf/collections.json` writes. OneDrive `approot` can create its folder on GET; defer first resolution to a disclosed initialization Push, or approve a narrowly described account-setup exception. Authentication grants are not file writes. [Microsoft app folders](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder). |

### 1.3 Security, storage, and platform feasibility

| ID / sections | Finding | Proposed resolution |
| --- | --- | --- |
| S1: 1, 6.2, 9.2 | Claims that tokens never pass through a Shelf server contradict the OAuth Worker. | Say files never pass through the Worker; GitHub codes and tokens pass through it during exchange/refresh. The Worker does not retain them. |
| S2: 9.3, 13.4, 19 | `github.com` is absent, despite OAuth authorization, Worker token exchange, PAT guidance, and Open in provider links. Research/build hosts are also absent. | Separate app resource requests, Worker egress, external user navigation, and development tooling. Propose exact `github.com` auth/egress/navigation entries. Do not auto-add runtime hosts from research. |
| S3: 9.3, 10.2 | OneDrive signed download and upload URLs need hosts not in the concrete CSP. | Maintain a deployment-reviewed exact-host list for observed Microsoft-owned transfer hosts, including upload sessions. Validate HTTPS, host, and port before use; no broad wildcard or runtime trust of arbitrary response URLs. Unknown hosts fail closed with an actionable message. |
| S4: 9.5, acceptance 11 | A literal ban on all tokens in URLs conflicts with preauthenticated OneDrive transfer URLs. | Never put OAuth bearer/refresh tokens in URLs. Propose a narrow exception for provider-issued signed transfer URLs: memory only, no logs/history/cache/diagnostics, no Authorization header when fetching them. Acceptance tests distinguish these capabilities from OAuth tokens. Until approved, affected transfers stay unavailable. |
| S5: 9.2, 9.3, 13.4 | `COOP: same-origin` can sever popup communication. MSAL memory caching does not support a full-page redirect workflow. | Plan memory-based popup auth with an exact-origin callback and a scoped `same-origin-allow-popups` policy where required. Test popup blockers and all three engines before enabling OAuth. Do not silently use sessionStorage. [MSAL caching](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching), [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). |
| S6: 9.3 | Google scripts may require styles/frames/resources beyond the sample headers. Picker can also introduce secret-bearing requests. | Start with token client only, then capture real GIS/Picker requests under enforcing CSP. Approve only required hosts/directives and redact URL credentials. Picker remains gated if it cannot meet the agreed policy. Google's documented styles endpoint is absent from `style-src`; do not add blanket inline scripts/styles. [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). |
| S7: 9.2, 19 | GitHub's old no-PKCE claim is stale. `state` supplied to a stateless Worker alone does not prove it was issued to this client. | Add S256 PKCE; retain state/verifier in the opener's memory and verify there before exchange. Use a short-lived signed Worker challenge if server-side state binding is required. Restrict redirect URI, method, content type, origin, and body size. CORS is not client authentication. [GitHub App user tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app). |
| S8: 9.2 | A 150-line stateless Worker with per-IP rate limits has no rate-limiter mechanism. | Treat line count as illustrative. Use a configured Cloudflare rate-limit binding or platform rule, not unreliable isolate-local counters. Setup must include it; never log request bodies. Deployment behavior is unverified until tested. |
| S9: 9.2 | Drive silent token renewal is promised. | Treat renewal as best effort and show Reconnect when interaction is needed. GIS documents user gestures for requesting a token. Retain pending changes. [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model). |
| S10: 9.5 | MSAL remember mode is not an off-the-shelf AES-GCM/PBKDF2 IndexedDB cache. | Default to memory. Investigate the installed MSAL public cache APIs before offering encrypted remember; no copying opaque library internals or enabling its default Web Storage cache. If unsupported, explicitly leave OneDrive remember unavailable and tracked. |
| S11: 6.5, 9.4 | HTML says scripts run in isolation, but bare `sandbox` disables scripts, and CSP blocks inline code anyway. | Security wins: scriptless, opaque-origin preview; amend explanatory copy. Deny forms, external resources, navigation, and popups in preview content. Executable previews require a separately reviewed design. |
| S12: 9.3, 9.4 | Sandboxing alone does not prevent untrusted content from requesting allowed hosts. External Markdown images conflict with `img-src`. | Strip/resolve content URLs through a central content policy. Resolve same-provider relative assets to approved blob URLs; external images are blocked. PDF scripting/actions stay disabled. Test hostile SVG, CSS URLs, Markdown, HTML, and PDF links. |
| S13: 10.4, 10.5 | OPFS bytes and IndexedDB records cannot share one atomic transaction. Crash safety is overstated. | Write temporary bytes, flush/close, publish a durable manifest record, then confirm staging in UI. Recovery reconciles pending journal records/orphans. Report quota failure without confirming success; test crashes at each boundary. |
| S14: 10.5, 10.13 | Discard removes bytes, but undo must restore them. Multiple tabs can race Push or migrations. | Keep undo-owned blobs until undo history expires; exclude them from cache eviction. Introduce a per-location writer lock and cross-tab coordination, with a tested fallback when Web Locks is absent. |
| S15: 9.6, 10.7 | Pinned files are exempt from the cache cap, while browser quotas remain finite. Clear cache and Wipe overlap. | Explain the cap applies to unpinned cache. Before pin/stage, estimate storage and handle quota errors. Clear cache never deletes pending bytes; Wipe removes all local state, including secrets, caches, worker registrations, and cross-tab memory. |
| S16: acceptance 17 | An app cannot erase cookies on provider origins or guarantee provider-wide logout offline. | Define Wipe as sign-out from every Shelf provider session, clear local credentials and data, cancel active work, and prevent stale writes. Best-effort token revocation is separate and must not delay local deletion. Do not claim global provider logout. |
| S17: 10.13, 17.1 | Seven-day eviction and `beforeunload` are presented too deterministically. | Describe browser storage as best effort, feature-test persistence, and never rely on unload events for saving. A fully acknowledged stage is durable before the user closes the tab. Verify installed iOS behavior on devices. |
| S18: 11, 14 M5/M6 | Offline reload is an M5 exit requirement, but shell service-worker work is in M6. | Bring minimal app-shell offline caching and previously used lazy-viewer asset caching into M5. M6 owns install/update UX and deployment hardening. No SW provider-response or file-byte caching. Amend shell-and-fonts-only wording to include required same-origin viewer assets. |
| S19: 11, 14 M6 | Current Lighthouse no longer has a PWA score. | Replace PWA >=90 with installability, offline navigation, manifest, update safety, and device-install checks. Retain Accessibility >=90 and explicit performance budgets. [Chrome installability update](https://developer.chrome.com/blog/update-install-criteria). |
| S20: 13.3 versus 6.2, 9.2 | Missing GitHub client ID hides a provider whose PAT path must always work. | GitHub PAT and Local stay visible without environment variables. GitHub sign-in requires both client ID and Worker origin. Other OAuth provider rows require their client IDs. |

### 1.4 Product, UI, and testing gaps

| ID / sections | Finding | Proposed resolution |
| --- | --- | --- |
| P1: 5.3, 5.7 | Some proposed status text and control borders fail contrast; dark provider hues are missing. | Use the audited palette in section 6 of this analysis. Decorative separators may be subtle; control boundaries and focus must meet 3:1. |
| P2: 5.4, 7.3 | Fontsource Next/Mono packages contain Latin subsets, not Devanagari. | Add a self-hosted Noto Sans Devanagari fallback for Hindi, preserving Atkinson as the Latin face. Verify shaping, mixed text, line heights, and font byte budget. [Fontsource Next](https://www.npmjs.com/package/@fontsource-variable/atkinson-hyperlegible-next). |
| P3: 5.9 versus 7.2 | Single-line mobile list conflicts with two-line mobile rows; 40px viewer toolbar cannot contain 44px touch targets. | Use 7.2's name-plus-metadata two-line mobile row, auto-height where Hindi requires it; viewer toolbar minimum 44px on coarse pointers. |
| P4: 5.2, 5.9, 8.5 | Sketch uses uppercase pane headings and PUBLIC/PRIVATE despite sentence-case rules. | Actual labels are Locations, Inspector, Public, Private. File extension tags remain conventional file-type abbreviations. |
| P5: 5.8, 6.3 | Deleted row collapses but explorer also displays it struck through. | Keep the pending delete in the working-copy explorer with its marker; animate removal only after discard/push or when a filter excludes it. |
| P6: 7.1, 6.3 | Focus offset versus inset row ring; virtualized rows may disappear while focused. | Offset ring for controls, inset ring for table rows. Keep the focused row mounted and use stable row IDs, row counts/indexes, and explicit focus recovery after deletion/filtering. |
| P7: 6.16 | Long press both opens context menu and enters selection. Browser-reserved shortcuts and single-letter keys collide with editing/assistive technology. | Long press enters selection; show a named More actions control for the menu. Scope single-key commands to the file/viewer surface, ignore editors/composition, provide a disable setting. Browser UI wins where shortcuts cannot be intercepted. |
| P8: 6.1, 4.2 | Refs omit account/drive identity; GitHub branches can contain slashes, and path strings contain reserved characters. | Use structured internal identity: provider/account/location/item/version. Define an encoded URL grammar and round-trip fixtures for `/`, `@`, `#`, `%`, Unicode, and branch slashes. Deep links contain no auth or signed download URLs. |
| P9: 10.2 | Types lack folders, copy/move plans, account identity, pagination/cursors, cancellation on writes, and partial outcomes. | Add explicit planned operations and result/checkpoint types before adapters. Capabilities are operation-specific; Local is import/export only. Preserve native kind/mode metadata for special Git entries. |
| P10: 10.2, 6.6 | Local cannot pass remote history/atomic-push tests; provider revisions differ. | Shared contract assertions are capability-gated, with explicit unsupported behavior tests. Do not skip tests. Historical restore stages downloaded version bytes; no remote change until Push. |
| P11: 6.3, 11 | Last-change commit information for every Git file needs many extra calls; 10,000 rows does not imply 10,000 requests. | Cache visible-row metadata, fetch progressively within a request budget, and leave unknown values empty with an explanation. Never fabricate timestamps or messages. |
| P12: 10.13, 13.1 | `client-zip` creates archives but cannot read them for restore. | M3 needs a bounded ZIP reader. Prefer a narrowly scoped, vetted reader after dependency review; candidate and exact version remain unverified in this task because not in 13.1. Validate manifest schema, sizes, hashes, traversal, duplicates, and expansion limits before any restore. [client-zip documentation](https://github.com/Touffy/client-zip). |
| P13: 14 M5 | Duplicate finder appears only in milestones, without behavior. | Compare size then SHA-256 over locally available bytes. Show exact duplicates, never auto-delete, and stage any user-requested delete through ordinary guards. Do not download an entire account just to find duplicates. |
| P14: 6.5, 14 | CSV, media, HTML, onboarding, history, and some viewer controls lack precise milestone assignment. | Assign read viewers and baseline full viewer controls to M1, GitHub history/restore to M3, other history to M4; M5 owns offline/search integration; M7 finalizes onboarding/Help. |
| P15: 6.13 | Roaming collections can conflict and reference a different account or inaccessible object. | Opt-in JSON sync is a staged file change with base-version checks. Import references as unresolved until matched to an authorized account. No token or signed URL in the file. |
| P16: 5.11, 16, AGENTS | Absolute raw-value bans would reject tokens, forced colors, vendor CSS, canvas dimensions, and this requested draft. | Define lint scope precisely: literals only in approved token/data definitions; authored component styles consume tokens. System colors are allowed only in the forced-colors token override. Vendor CSS is reviewed, not edited blindly. Dynamic geometry is measured data, not an arbitrary styling escape hatch. |
| P17: 12, 13.5, 14 | `check` excludes e2e/a11y/audit/licences while milestone completion requires them. | Keep the documented quick check composition but require separate CI e2e, a11y, visual, security, licence, and performance jobs before a milestone exit. M0 creates those jobs; each new feature extends them. |
| P18: 11 | Performance targets lack devices, cold/warm definitions, sample sizes, and memory methodology. | Pin browser/tool versions and a named reference Android device; use deterministic generated fixtures, five measured runs after warmup, report p50/p95 and failures. CI gates use agreed reproducible CPU/network settings; device checks supplement them. |
| P19: 9.7, 13.1 | Latest dependencies do not form a peer-compatible toolchain; package budget is ambiguous. | Section 2 records the actual conflict. Count direct runtime packages under 40, audit the complete transitive graph separately, and document every compatibility exception. Do not install with force or ignore-peer flags merely to get green. |
| P20: 9.7 | `ignore-scripts=true` can prevent native/tool/browser setup. | Keep it enabled. M0 validates a clean frozen install and uses explicitly reviewed tool setup commands, such as Playwright browser installation, rather than enabling all lifecycle scripts. |

## 2. Dependency verification

### 2.1 Method and meaning of current

Queried the public npm registry directly on 2026-11-15 for each package's `dist-tags.latest`, matching version metadata, publication date, deprecation field, engines, peer dependencies, and licence. Registry links below are reproducible primary sources. These are observed latest releases, not claims that they have been installed, audited, benchmarked, or proven compatible together. Search-engine snippets were not used to choose versions.

All latest versions below returned no npm deprecation marker. That is not proof of active maintenance or safety. Exact runtime pins and a committed lockfile are required at implementation time, with a fresh check then. Optional peers are not an instruction to install every peer.

### 2.2 Runtime and build packages from 13.1

| Library | Exact npm package | Latest verified | Assessment / intended integration |
| --- | --- | --- | --- |
| Vite | [vite](https://registry.npmjs.org/vite/latest) | 8.3.8 | Node `^20.19.0` or `>=22.12.0`; chosen Node must also satisfy tools below. |
| React | [react](https://registry.npmjs.org/react/latest) | 19.3.1 | Pin together with React DOM; runtime peer ranges below accept React 19. |
| React DOM | [react-dom](https://registry.npmjs.org/react-dom/latest) | 19.3.1 | Required browser renderer; React peer `^19.3.1`. |
| TypeScript | [typescript](https://registry.npmjs.org/typescript/latest) | 7.0.2 | Incompatible with current typescript-eslint's `<6.1.0` peer range. See toolchain gate below. |
| React Aria Components | [react-aria-components](https://registry.npmjs.org/react-aria-components/latest) | 1.22.1 | Unstyled behavior exception to the component-kit ban. Use CSS Modules; test Tree and virtual-grid integration independently. |
| TanStack Virtual | [@tanstack/react-virtual](https://registry.npmjs.org/@tanstack%2Freact-virtual/latest) | 3.14.26 | Correct React adapter; `@tanstack/virtual-core` is transitive. Positioning uses style attributes allowed by current CSP; preserve keyboard focus while virtualizing. |
| Zustand | [zustand](https://registry.npmjs.org/zustand/latest) | 5.1.0 | Use selectors; do not use default localStorage persistence for tokens or working-copy state. |
| IndexedDB wrapper | [idb](https://registry.npmjs.org/idb/latest) | 8.0.4 | Storage migrations and quota/blocked-version tests required. |
| PDF.js | [pdfjs-dist](https://registry.npmjs.org/pdfjs-dist/latest) | 6.5.438 | Node `>=22.13.0` or `>=24`; browser support is a separate test. Same-version local core/worker/CMaps/fonts/WASM assets. |
| PDF split | [pdf-lib](https://registry.npmjs.org/pdf-lib/latest) | 1.17.1 | Maintenance risk: latest release 2021-11-06; repository not archived, last reported push 2024-07-17. Do not call it definitively abandoned, but treat active support as unverified. |
| Search | [minisearch](https://registry.npmjs.org/minisearch/latest) | 7.2.0 | Latest publish 2025-09-16. Release cadence is slow; abandonment is not established. Lazy worker usage, bounded indexes; phrase matching needs a post-filter on page text. |
| ZIP export | [client-zip](https://registry.npmjs.org/client-zip/latest) | 2.5.1 | Latest publish 2026-09-14. ES2020/BigInt/streams; generator only, no restore reader. |
| Markdown parser | [marked](https://registry.npmjs.org/marked/latest) | 18.2.0 | Does not sanitize output. Bundle locally and always pass through the single sanitizer. |
| Sanitizer | [dompurify](https://registry.npmjs.org/dompurify/latest) | 3.4.18 | Latest publish 2026-11-14. DOM-based sanitizer in browser; tighten URL/tag policy. Licence choice is MPL-2.0 or Apache-2.0. |
| Syntax highlight | [highlight.js](https://registry.npmjs.org/highlight.js/latest) | 11.12.0 | Import core and a small explicit grammar list; tokenize theme colors through approved CSS. Never ship the full language set by default. |
| Localisation | [i18next](https://registry.npmjs.org/i18next/latest) | 27.1.2 | Node >=22 in package metadata. Load local dictionaries; no remote translation backend. React binding is not specified, so begin with a small project-owned hook. |
| UI font | [@fontsource-variable/atkinson-hyperlegible-next](https://registry.npmjs.org/@fontsource-variable%2Fatkinson-hyperlegible-next/latest) | 5.3.0 | Correct variable package; local WOFF2, Latin subsets. Family name `Atkinson Hyperlegible Next Variable`. OFL-1.1. |
| Path/ref/hash font | [@fontsource-variable/atkinson-hyperlegible-mono](https://registry.npmjs.org/@fontsource-variable%2Fatkinson-hyperlegible-mono/latest) | 5.3.0 | Correct variable package; family `Atkinson Hyperlegible Mono Variable`. OFL-1.1. Do not confuse with the static `@fontsource` package. |
| MSAL browser | [@azure/msal-browser](https://registry.npmjs.org/@azure%2Fmsal-browser/latest) | 5.29.1 | Bundle ESM; configure memory cache explicitly. OAuth hosts, popup policy, and encrypted remember integration require a spike. Old CDN delivery is deprecated, not this package. |
| Dropbox SDK option | [dropbox](https://registry.npmjs.org/dropbox/latest) | 10.66.0 | Correct SDK; Node >=22 metadata. Choose plain fetch initially to reduce package count and centralize allowlist enforcement. |
| PWA Vite integration | [vite-plugin-pwa](https://registry.npmjs.org/vite-plugin-pwa/latest) | 2.0.0 | Vite 8 supported by peer range; Node >=20.19.0. Build-time dependency. Use `injectManifest` with an explicit cache policy and prompt-based updates. |
| Workbox build | [workbox-build](https://registry.npmjs.org/workbox-build/latest) | 7.4.1 | Matches PWA plugin peer range; build-time only. |
| Workbox window | [workbox-window](https://registry.npmjs.org/workbox-window/latest) | 7.4.1 | Matches PWA plugin peer range; small client registration helper when used. |

Proposed extra font, to resolve Hindi coverage: [@fontsource-variable/noto-sans-devanagari](https://registry.npmjs.org/@fontsource-variable%2Fnoto-sans-devanagari/latest) **5.3.0**, verified separately. This is an explicit proposed addition, not a hidden member of 13.1. Subset/family CSS must be checked when importing it. No icon dependency is needed initially; draw the small required outline set in project-owned SVG.

### 2.3 Quality and deployment packages from 13.1

| Tool | Exact npm package | Latest verified | Compatibility note |
| --- | --- | --- | --- |
| ESLint | [eslint](https://registry.npmjs.org/eslint/latest) | 10.15.0 | Current major is outside jsx-a11y's published peer range. |
| TypeScript ESLint | [typescript-eslint](https://registry.npmjs.org/typescript-eslint/latest) | 8.72.2 | Accepts ESLint 8.57/9/10; requires TypeScript `>=4.8.4 <6.1.0`. |
| JSX accessibility rules | [eslint-plugin-jsx-a11y](https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest) | 6.10.2 | Latest publish 2024-10-26; peer supports ESLint only through 9. No npm deprecation marker, but ESLint 10 integration is unverified/incompatible as declared. |
| Prettier | [prettier](https://registry.npmjs.org/prettier/latest) | 3.10.1 | Dev only. |
| Stylelint | [stylelint](https://registry.npmjs.org/stylelint/latest) | 18.0.0 | Requires Node `^22.22.2`, `^24.15.0`, or `>=26.0.0`. Custom rules must target this API. |
| Vitest | [vitest](https://registry.npmjs.org/vitest/latest) | 5.1.0 | Node 22.12+/24+/26+, Vite 6.4/7/8 peers. DOM/browser environment needs an explicit implementation choice. |
| Testing Library React | [@testing-library/react](https://registry.npmjs.org/@testing-library%2Freact/latest) | 16.3.3 | React 18/19 and Testing Library DOM 10 peers. |
| Testing Library DOM | [@testing-library/dom](https://registry.npmjs.org/@testing-library%2Fdom/latest) | 10.4.2 | Required React testing peer. |
| User interactions | [@testing-library/user-event](https://registry.npmjs.org/@testing-library%2Fuser-event/latest) | 14.6.10 | Use realistic focus and keyboard events. |
| DOM assertions | [@testing-library/jest-dom](https://registry.npmjs.org/@testing-library%2Fjest-dom/latest) | 7.0.1 | Node >=22; use Vitest integration. |
| MSW | [msw](https://registry.npmjs.org/msw/latest) | 3.0.6 | Node >=22.12.0, Vite >=6, TypeScript >=5.9.x. Fresh release on verification date; validate chosen test setup. |
| Playwright test runner | [@playwright/test](https://registry.npmjs.org/@playwright%2Ftest/latest) | 1.65.1 | Exact browser revisions follow lockfile/tool installation. |
| Axe integration | [@axe-core/playwright](https://registry.npmjs.org/@axe-core%2Fplaywright/latest) | 4.14.0 | Node >=22.12.0; Playwright core peer. |
| Lighthouse CI | [@lhci/cli](https://registry.npmjs.org/@lhci%2Fcli/latest) | 0.16.1 | Node >=22.19.0. Use supported categories and separate PWA assertions. |
| Worker deployment | [wrangler](https://registry.npmjs.org/wrangler/latest) | 4.162.0 | Node >=22.12.0. Dev/deployment only; never bundle credentials or CLI into app. |

**Toolchain feasibility gate for M0:** the available Node 24.19.0 satisfies the listed engines. Proposed temporary TypeScript compatibility pin is [typescript 6.0.3](https://registry.npmjs.org/typescript/6.0.3), verified, with an explicit exception to latest-stable wording. The latest ESLint 9 version, [9.39.5](https://registry.npmjs.org/eslint/9.39.5), was also checked and is explicitly deprecated as unsupported. Do not quietly select it to hide the jsx-a11y conflict. Prefer supported ESLint 10, investigate a tested upstream-compatible jsx-a11y update or documented peer-range-only compatibility patch, and require the full rule suite before accepting a patch. If that cannot be demonstrated, the lint-toolchain part of M0 remains blocked; other foundation work can proceed. No compatible full install is claimed here.

### 2.4 CSP, networking, maintenance, and audit limits

| Area | Feasibility and required proof |
| --- | --- |
| Self-hosted fonts, React, state, search, ZIP, highlight, i18n | No inherent need for runtime third-party hosts when locally bundled. This is an integration assessment, not a complete source/transitive audit. Detect unexpected network calls in the built app. |
| React Aria / TanStack | Runtime measurement/position attributes must work under `style-src-attr 'unsafe-inline'`; generated style elements, overlay positioning, and CSP violations need a built-browser test. Do not add script `unsafe-eval` to solve UI issues. |
| PDF.js | Use `isEvalSupported: false`, disable PDF JS/actions, self-host all matching worker/decoder/font assets, and retain narrowly scoped WASM permission only if used. Do not import a CDN worker. `blob:` fonts may be needed by some PDF font-loading paths; prefer testing `disableFontFace` under the supplied `font-src 'self'`, measuring text/visual fidelity, before proposing a scoped CSP change. Version-specific rendering/worker paths remain unverified until M1. [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html). |
| pdf-lib | Process untrusted PDFs in a cancellable worker, reject encrypted documents, cap bytes/pages/time/memory, and preserve originals. Maintenance risk does not disappear because it is pure JavaScript. It does not decrypt through `ignoreEncryption`. [pdf-lib limitations](https://github.com/Hopding/pdf-lib#encryption-handling), [repository metadata](https://api.github.com/repos/Hopding/pdf-lib). |
| MSAL | Default sessionStorage is forbidden. Use memory explicitly; prove popup and callback behavior plus no persistence in all supported engines. Do not use the deprecated Microsoft CDN distribution. [MSAL caching](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching), [CDN deprecation](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/cdn-usage). |
| GIS / Picker | External script exception is real: Google requires loading its live library rather than self-hosting it. These are integrations, not npm packages. Full transitive host and secret-in-URL compatibility remains unverified until a real flow is observed. [GIS loading requirement](https://developers.google.com/identity/oauth2/web/guides/load-3p-authorization-library). |
| vite-plugin-pwa / Workbox | Avoid generated inline registration, default broad precache globs, API runtime caching, CDN imports, and automatic `skipWaiting` during Push. Configure a same-origin script registration and an explicit static asset manifest. Test CSP on a production build, not only Vite dev. |
| Supply chain | No install, npm audit, transitive licence review, tarball review, or package-size benchmark was performed in this documentation task. Those results are **unverified**. No library is certified vulnerability-free. No package besides the checked ESLint 9 fallback was observed deprecated. pdf-lib and jsx-a11y receive explicit maintenance/compatibility flags rather than speculative abandonment claims. |

## 3. Provider API feasibility and mitigations

The adapters are feasible for restricted document-library use, but none of the real-account browser flows has been executed in this task. MSW proves our interpretation, not provider CORS, permissions, or account-policy behavior.

### 3.1 GitHub

| Risk | Mitigation and required test |
| --- | --- |
| Recursive trees truncate; per-folder Contents listings cap at 1,000. | Use recursive trees only when complete, then non-recursive subtree traversal, not repeated Contents listing. Preserve mode/type, symlink and submodule markers. Fixtures exceed both API limits. The recursive limit is 100,000 entries or 7 MB. [Trees API](https://docs.github.com/en/rest/git/trees), [Contents API](https://docs.github.com/en/rest/repos/contents). |
| Initialized and empty repos have different commit behavior. | Detect absence of branch history, disclose bootstrap plan, and checkpoint it separately. Empty repos cannot create refs through the usual endpoint. [References API](https://docs.github.com/en/rest/git/refs). |
| Protected branches/rulesets, required signatures/checks, workflow-file permissions. | Preflight what is available, surface exact provider failure, keep staging, and offer an explicit new-branch target where allowed. Never force-update. A Contents permission does not guarantee every path/ruleset allows writes. |
| Race between head read and ref update; add/add, rename, folder, and delete conflicts. | Compare all read/write paths including rename destinations, pin source blob IDs, use `force:false`, re-read after failure, rebase only disjoint paths once. Unknown outcomes first reconcile actual head. Preserve executable mode instead of rewriting every existing file as 100644. |
| Private/raw downloads, size restrictions, base64 memory inflation. | Prefer API-host raw responses for private data, never private raw URLs with query tokens. Contents raw supports the intermediate file-size range; unsupported older oversized objects stay metadata-only. Process one bounded blob at a time, with progress that honestly describes bytes prepared/sent/completed. [Contents API](https://docs.github.com/en/rest/repos/contents). |
| LFS attributes/pointers, case collisions, branch/path encoding, malicious names. | Recognize pointers; fail closed on uncertain `.gitattributes` matching. Do not edit symlinks/submodules. Test Unicode/case collisions and encoded refs. No broad LFS host exception. |
| Rate ceilings and last-change lookups vary by token/account. | Read actual rate-limit headers, cache listings and visible-row metadata, honor `Retry-After`, bounded retries, global mutation pacing. Avoid hard-coding 5,000 as the only possible limit in UI copy. |
| Multi-part push cancel/failure leaves earlier commits. | Persist each committed part; only clear confirmed changes. Explain that cancel stops remaining work and cannot undo already published commits. Orphaned blob creation is not the same as no remote network mutation. |

GitHub OAuth additionally needs the Worker, valid non-fragment callback, PKCE, `github.com` egress, and token refresh locking. Public-repo acknowledgements are required for the actual destination on every new attempt.

### 3.2 Google Drive

| Risk | Mitigation and required test |
| --- | --- |
| `drive.file` is per-file, not a grant to browse all Drive or all descendants of a picked folder. | Label the location as files created/opened with Shelf. Create a normal Shelf folder during an authorized initialization, and use Picker to grant specific existing items. Never request broad `drive`/`drive.readonly` as a workaround. Folder-recursion permission behavior is a real-account gate. [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth). |
| App folder terminology confuses a normal folder with hidden `appDataFolder`. | Do not use hidden app-data scope for document storage. Keep explicit folder IDs and account identity. |
| Google-native Docs/Sheets/Slides are not binary files and lack ordinary content hashes. | Metadata and Open in provider are the baseline. A future explicit export cannot be described as a lossless move; never delete a native source after a format conversion. Standard export is limited to 10 MB. [Download/export guide](https://developers.google.com/workspace/drive/api/guides/manage-downloads). |
| Duplicate names, shortcuts, pagination, shared-drive permission differences. | Use IDs as identity, show collisions instead of choosing arbitrarily, bound shortcut traversal, fetch every page, and check item capabilities. Shared-drive coverage is unverified; gate unsupported operations without scope escalation. |
| MD5 may be absent, revisions can expire, and modify/delete conditional behavior must be verified. | Use read-back SHA-256; retain version tokens and recheck before destructive writes. Where an atomic precondition cannot be established, refuse automatic destructive completion rather than promise zero data loss. Include real races and vanished revision tests. |
| Resumable upload URLs, token expiry, unknown upload outcome. | Use resumable above the selected 5 MB policy, track server offset, keep session capability URLs out of logs, verify all returned hosts, and reconcile before retries. Session-resume semantics under current CORS are unverified until M4. |
| GIS interaction/CSP/Picker permission setup. | Test cancellation, partial consent, popup blocks, user-gesture reconnect, correct project number, referrer-restricted API key, and offline behavior. No assumption of silent renewal. [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model). |

### 3.3 Dropbox

| Risk | Mitigation and required test |
| --- | --- |
| App-folder access is not full Dropbox, production app limits apply, refresh tokens require careful custody. | Display the scope plainly; PKCE without client secret. Keep refresh tokens in memory unless encrypted remember is selected. Configure `files.metadata.read`, `files.content.read`, `files.content.write`; add `account_info.read` if quota/account identity requires it. Approval is a human release gate. [Dropbox OAuth](https://docs.dropboxapi.com/dropbox-api/docs/oauth). |
| Cursor pagination/reset, case-insensitive paths, and revision-specific updates. | Exhaust cursors, restart expired enumeration safely, use stable IDs/revisions, detect case-only changes, and use strict update mode rather than unconditional overwrite. Test concurrent rename/delete and failed restore. |
| Large uploads and resumable outcome ambiguity. | Use sequential 8 MiB chunks above 8 MiB. API requests must stay within 150 MiB, session IDs expire, and server offset is authoritative. Reconcile offsets before replaying. [Upload sessions](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-start). |
| Native `content_hash` is not a whole-file SHA-256. | Implement 4 MiB block hashing only for native metadata comparison, using official known-answer fixtures. Required move verification still downloads the destination and compares ordinary SHA-256. [Dropbox content hash](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash). |
| CORS/header errors and quota/business restrictions. | Use only API/content hosts, test `Dropbox-API-Arg` encoding with Unicode, map scope/quota/rate-limit errors, and never fall back to public shared links. Real browser transfer remains unverified until M4. |

### 3.4 OneDrive

| Risk | Mitigation and required test |
| --- | --- |
| `/content` returns a redirect incompatible with the documented browser Authorization/preflight path. | Request `@microsoft.graph.downloadUrl` from item metadata, then fetch that URL directly without Authorization after exact-host validation. Treat it as ephemeral and secret. Test expiry and reacquisition. [Graph JavaScript downloads](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0). |
| Personal and organizational transfer hosts differ; redirects and upload hosts are missing from CSP. | Observe both account classes, review Microsoft ownership, add exact hosts to deployment policy, and refuse unknown redirect targets. `redirect:'error'` is the safe default where a direct URL is expected; never blindly forward bearer headers. Real host inventory is **unverified**. |
| AppFolder scope and endpoint permission tables are not uniformly documented. | App-folder guide supports dedicated least-privilege access; upload-session table lists broader Files.ReadWrite. Treat exact operation support as a real-account gate, not permission to widen scope. Exercise list/read/upload/rename/delete/history on personal and work accounts before enabling each capability. [App-folder guide](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder), [Upload-session permissions](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0). |
| App-folder resolution can itself create the folder. | Keep initialization visibly within the approved mutation boundary, as G15 proposes. Never assume all GET requests are free of storage side effects. |
| Upload-session chunk rules, expiry, conflicts, and transient URLs. | Keep README's conservative session threshold above 4 MiB; send sequential chunks using a multiple of 320 KiB, below 60 MiB, except the final remainder. Use a 5 MiB chunk target, honor server missing ranges, and do not attach a bearer token to upload URLs. [Upload-session protocol](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0). |
| eTag/cTag/hash/revision differences; concurrent deletion after copy. | Use item IDs plus drive/account identity and supported If-Match preconditions. Native hashes are optional hints; read-back SHA-256 is authoritative. If the source changed, retain it and show a conflict after the verified copy. |
| MSAL memory auth, tenant consent, conditional access, history download hosts. | Memory-only popup flow, actionable interaction-required handling, explicit callback page, no token logging. Test both account classes and revision reads. Unsupported tenant policy is a provider setup limitation, never a reason to bypass security. |

### 3.5 Local and transfer-wide constraints

Local is import/export, not live synchronization. Snapshot bytes into local staging immediately; a picked directory handle does not imply permission after reload. Firefox/WebKit use directory-input import and ZIP/file export fallback. A destination copy that succeeds while source deletion fails is an honest partial move, not a failed copy to be repeated. All destructive retry decisions require durable checkpoint and version evidence.

## 4. Milestone task breakdown in dependency order

Paths below are planned files/directories, not created product files. Every implementation task includes locale keys, accessible states, Help content where user-visible, appropriate tests, and a PROGRESS entry. Parallel work below describes independent tasks within a milestone only; no agents have been delegated in this task. Do not begin the next milestone without owner approval.

### M0 Foundation

1. Toolchain and policy gate: `package.json`, exact lockfile, `.npmrc`, `.node-version`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `stylelint.config.js`, `prettier.config.js`, `index.html`, `scripts/check-design.mjs`, `scripts/check-size.mjs`. Resolve the section 2 peer conflicts and test frozen install with scripts disabled.
2. Tokens and type: `src/styles/tokens.css`, `fonts.css`, `base.css`; initial `src/i18n/{en,hi}/common.json`; font assets/licences. Test numeric contrast and Hindi glyph coverage.
3. Primitives: `src/ui/{Button,IconButton,Input,Select,Checkbox,Kbd,Badge,Meter,Tooltip,ProviderMark,FileGlyph}` with colocated CSS Modules. Add shared FocusRing/Field/Progress helpers only when needed. Build all applicable states.
4. Harness: `src/app/router.ts`, `src/screens/Styleguide.tsx`, `tests/setup.ts`, `tests/design/{contrast,lint-policy,locale}.test.ts`, `tests/ui/*.test.tsx`, `e2e/styleguide.spec.ts`, `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`.
5. Planning/support docs: `SETUP.md` with [HUMAN] items first, `docs/dependencies.md`, `docs/design-qa.md`, `LICENSE`, `.github/dependabot.yml`; add minimal security/network test utilities for later milestones.

Parallel after token and API contracts settle: primitive families, tooling tests, and setup/licence documentation. Integrate primitives into Styleguide before any real screen. Exit: `check` and separate axe/visual jobs pass; deliberately banned fixture styles fail lint; light/dark/density snapshots approved. No provider or product screen is required to claim M0 complete.

### M1 Shell and GitHub read

1. Normalized contracts and core: `src/providers/types.ts`, `src/lib/{paths,format,errors}.ts`, `src/services/{network,router,content-policy}/`, `src/store/{session,locations,selection,ui}/`. Define account-safe refs, capability flags, and typed errors before adapters/UI.
2. Persistence/read prerequisites: `src/services/storage/{db,bytes,migrations}.ts`, small version-aware read cache and viewer-position records. Add `src/services/auth/memory.ts`, PAT handling, initial wipe/cancel support. Security is enforced now, not first introduced at M6.
3. Adapter and services: `src/providers/github/{client,list,read,metadata,auth}.ts`; `tests/providers/{contract,github-read}.test.ts`, `fixtures/github/`, `tests/msw/handlers.ts`. Include truncation, >1,000-child folder, branch/path encoding, mode, LFS pointer, rate-limit, and token-expiry fixtures.
4. Styleguide composites then shell/screens: `src/components/{Tree,FileTable,Breadcrumbs,AddressBar,Inspector,GuardStrip,PendingTray,StatusBar,QuickLook}/`; `src/app/{Shell,ErrorBoundary}.tsx`; `src/screens/{Connect,Library,Explorer,Viewer}.tsx`. Pending tray is read-only empty state until M3. Guards show required fixed text.
5. Viewers: `src/viewers/{pdf,image,markdown,code,media,csv,html}/`, `src/workers/thumbnail.ts`, single sanitizer, blob-lifetime manager. PDF text/search/outline/thumbnails/zoom/page restore and viewer keyboard controls belong here. Include metadata-only unsupported types. Add strict-CSP production preview headers and hostile fixtures.
6. `e2e/{github-read,viewer,deep-link,responsive}.spec.ts`, component grid/tree focus tests, initial bundle/performance baselines.

Parallel after provider/read and viewer contracts: shell composites, independent viewers, and GitHub read adapter. Exit: a real initialized repo browses, a PDF opens, deep links reload, token handling and hostile previews pass. Record account-dependent checks separately from mocks.

### M2 Guards

1. `src/lib/limits.ts`, `src/services/guards/{file,repo,visibility,sensitive,lfs}.ts`, exact-byte fixtures and all section 8.10 tests.
2. `src/components/{RepoMeter,SizeLedger,GuardDialogs,VisibilityBadge}/`; extend GuardStrip, FileTable weight rules, and Styleguide with all guard tiers and long Hindi text.
3. `src/i18n/{en,hi}/guards.json`, guard Help text, `tests/guards/*.test.ts`, `e2e/guards.spec.ts`. Test guard services even before staging exists, then exercise pre-stage UI intents; no enabled remote mutation path yet.

Parallel: pure verdict test matrices and guard composite styling once verdict types are fixed. Exit: all boundaries pass, 150 MB cannot enter a GitHub stage intent, public confirmation behavior is demonstrated in the Push-dialog harness. Re-run end-to-end through real staging in M3.

### M3 Staging and push

1. Durable records and recovery: `src/services/staging/{journal,commands,recovery,undo,backup,restore}.ts`, `src/store/staging/`, IndexedDB migrations, OPFS fallback, cross-tab locks, safe ZIP reader decision. `tests/staging/{crash,quota,undo,backup,migrations,locks}.test.ts`.
2. Git planning: `src/services/push/{plan,preflight,checkpoint}.ts`, `src/providers/github/{push,conflicts,history,create-location}.ts`. Implement batching, pacing, initialized/empty repos, protected branches, modes, adds/renames/deletes, unknown outcomes, and explicit target changes.
3. Composites first: full PendingTray, `PendingReview`, `PushDialog`, `ConflictDialog`, `HistoryPanel`, backup/restore and create-location dialogs; then `src/screens/PendingReview.tsx` and upload/rename/move/delete entry points. Add toast/live-region services.
4. `e2e/{atomic-push,conflicts,working-copy,public-push}.spec.ts`; full service tests for guards on actual bytes, source version changes, part failures, cancel, no-write-before-Push, and checkpoint recovery. Document empty-repo and split-push exceptions explicitly.

Parallel after durable staging/plan schemas: GitHub push adapter, review composites, and backup reader validation. Exit: three adds and one delete on an initialized repo create exactly one commit; concurrent edit is preserved; five staged changes survive termination and backup round-trip. All authorized mutations require Push and pass guards.

### M4 Other providers and moves

1. Prove real auth/CORS/permissions within policy: `src/services/auth/{google,dropbox,microsoft,callback}.ts`, `public/auth/*/index.html`, reviewed allowlist/CSP changes and `SETUP.md` entries. Provider flags fail closed until their flows work.
2. `src/providers/{gdrive,dropbox,onedrive}/` each with auth integration, list/read/write/history/quota/errors and resumable transfer code. `src/providers/local/` supports import/export; `_template/` documents capability contract. Create `tests/providers/<provider>.test.ts` and realistic MSW cases for all variants, with separate real-account smoke scripts.
3. `src/services/transfer/{plan,copy,verify,delete,recovery}.ts`, `src/workers/hash.ts`, SHA-256 and native-hash helpers. Durable linked operations with pinned source version and target IDs. `tests/transfer/*.test.ts` inject failures after every checkpoint.
4. `src/components/{SplitView,MoveDialog,TransferProgress}/`; provider histories and restore; `src/workers/pdfSplit.ts`, `src/services/pdf-split/`, Split dialog. Measure output bytes, refuse >300 MB/encrypted/unsplittable documents, preserve originals. Run advanced-LFS feasibility gate and document any refused path.
5. `e2e/{cross-provider,upload-resume,pdf-split,local-import-export}.spec.ts`; add source-changed-after-copy and verification-mismatch cases.

Parallel after shared adapter contract: three cloud adapters, Local adapter, PDF split; transfer coordinator starts against contract fixtures and then integrates real adapters. Merge flags provider by provider without skipping required contracts. Exit: every enabled provider passes contracts and real-browser gates; move verifies before deletion. Required providers still blocked on setup remain explicitly partial, not a completed M4.

### M5 Library features

1. Complete `src/services/cache/{lru,pinning,offline,versioning}.ts`, `src/workers/pdfIndex.ts`, `src/services/search/{index,query,phrase}.ts`, `src/store/recents/`. Worker extraction is bounded/cancellable; phrase results validate page text after candidate retrieval.
2. Minimal offline app runtime: `src/sw.ts`, explicit static asset manifest and viewer asset caching after first use. File bytes remain in OPFS/IndexedDB. Test full offline reload rather than only staying in an open tab.
3. `src/services/{collections,tags,duplicates,export}/`; schema/version checks and staged opt-in collection sync; no automatic duplicate deletion. Add filename indexes, favorites, recents, navigation and saved viewer state.
4. `src/components/{CommandPalette,GridView,ColumnView,CollectionEditor,DuplicateResults}/`, then `src/screens/Search.tsx` and full Library content. Add all views to Styleguide before screen use.
5. `e2e/{offline,search,collections,duplicates,zip,views}.spec.ts`, cache pressure, pinned overflow, index eviction, phrase/page tests, offline position/version tests.

Parallel after cache/version contract: search worker, collections/tags, view composites, export and duplicate UI. Exit: cached 20 MB PDF reopens offline at page 50 after reload; phrase search opens page 12; cache and working-copy ownership never mix.

### M6 Platform

1. `worker/src/{index,oauth,validation,rate-limit}.ts`, `worker/wrangler.jsonc`, `worker/README.md`, Worker auth tests; GitHub popup/callback integration, PKCE/state/refresh synchronization, encrypted-token vault where supported.
2. `extension/{manifest.json,background.ts,popup.html}` and tests. Minimal action/activeTab permission, parse supported provider URLs, construct a secret-free Shelf deep link. No token access, background scraping, or extra hosts.
3. `public/{manifest.webmanifest,icons,_headers}`, update registration/flow, freeze active push plan against updates, shell/viewer asset revisions, install instructions. `e2e/{install,update,network-allowlist,csp,token-storage,wipe}.spec.ts`.
4. `src/screens/Settings.tsx`, privacy content and `/privacy/index.html`, `src/services/{crypto,diagnostics,wipe}/`, provider settings, idle lock, cache controls, keyboard preferences. Earlier minimal controls are consolidated, not deferred security fixes.

Parallel: isolated Worker, extension, settings/privacy, and install/update UX after security interfaces are fixed. Exit: allowlist and token-leak tests pass, real GitHub OAuth works, PWA functional checks replace obsolete Lighthouse score, active pushes survive update availability. Real external setup must be recorded.

### M7 Release

1. Complete `src/screens/Help.tsx`, first-run guidance and empty/error copy; all `src/i18n/{en,hi}/*.json` reviewed by a fluent Hindi reader. No unreviewed placeholders.
2. `docs/{release,privacy,design-qa,dependencies}.md`, `SETUP.md`, licence notices, support and deployment instructions. Record screenshots, reviewer notes, test hardware/browser versions, reference-fixture hashes, and known limitations.
3. Full `e2e/` acceptance matrix on Chromium/Firefox/WebKit, NVDA/VoiceOver and touch device passes, frozen-install audit/licences, real throwaway-provider flows, performance and memory measurements.
4. Only after all required features are complete: build release artifact, verify hosted headers/callback/privacy URLs, run release checklist, and request any publication approval separately if publication has not already been authorized.

Parallel: independent language, accessibility, security, provider and performance reviews. Fixes re-enter their relevant tests. Exit: all 18 acceptance criteria pass, all mandatory provider/manual gates complete, documented exceptions explicitly approved. Feature flags do not erase unfinished required scope.

## 5. Test plan mapped to all 18 acceptance criteria

Baseline: Vitest for pure logic, Testing Library for control behavior, MSW for deterministic protocol failures, Playwright for browser flows in Chromium/Firefox/WebKit. Test fixtures are clearly labelled samples and excluded from production. Use seeded bytes and realistic PDF fixtures with known page counts/text; large files can be generated in test setup. Tests never require production credentials. Real-provider verification is an additional gate, not a substitute for deterministic tests.

| AC | Test and assertions | Milestone / evidence |
| --- | --- | --- |
| 1 | Stage a 150 MiB PDF and a 150,000,000-byte file: both blocked before persistence or request. Test 95 MiB minus one byte and exact 95 MiB. Remedy dialog lists connected destinations, PDF Split, no preselected action; cancel preserves original. Disconnected destinations show an explicit connect route outside the action list. | M2 logic/dialog, M3 stage integration, M4 remedies; `e2e/guards.spec.ts`. |
| 2 | 70 MiB requires affirmative Stage anyway; cancel produces no stage. 30 MiB only adds Large chip. Test 25 and 50 MiB boundaries plus a byte below each; ensure actual blob size, not supplied metadata, controls result. Recheck at Push. | M2/M3; guard units and stage component/e2e tests. |
| 3 | Synthetic `repo.size` reports 1.2 GiB and 5.2 GiB after KB conversion. Warn every attempt for the former; block latter until current-attempt override and explanation. Deletions never lower history estimate; existing file blocks remain. Include exact 500 MiB/1 GiB/5 GiB boundaries. | M2/M3; repo tests, Push-dialog e2e. |
| 4 | Public target cannot push by click/Enter/keyboard/service shortcut without unchecked-by-default checkbox. Reopen, switch target, reconnect or change visibility resets consent. Private-to-public metadata change before write reopens confirmation. Sensitive filename requires its separate acknowledgement. | M2/M3; visibility preflight tests and `public-push.spec.ts`. |
| 5 | Check exact required 100 MB/1 GB copy in every GitHub location, Library home, and Connect GitHub row. At mobile width/zoom it wraps rather than disappears. No dismiss action or setting; screenshots verify visibility. | M1/M2/M7; route matrix and responsive screenshots. |
| 6 | Initialized branch fixture: three adds plus one delete below 500 MiB creates exactly one commit and one final ref update; tree contains all four operations and unchanged siblings/modes. Separate empty-repo and >500 MiB tests expect disclosed multiple parts. Real throwaway repo confirms commit count and tree. | M3; atomic-push service tests and e2e, human commit inspection. |
| 7 | Stage modify then advance remote with same-path edit. Assert no silent ref write, both contents retained, all four conflict actions, second confirm for Keep mine. Also add/add, rename destination, delete, unrelated upstream commit, and lost ref-response cases. | M3; conflict unit matrix and `conflicts.spec.ts`. |
| 8 | Open a real 20 MiB PDF with >=50 pages; await durable cache and position save; page 50; force offline, reload, reopen without auth. Assert rendered page 50, cached bytes version, no network dependency for previously loaded PDF assets. Repeat with IDB fallback and pinned cache. | M5; `offline.spec.ts`, M7 device test. |
| 9 | GitHub-to-Drive linked move: record copy, read-back SHA-256, source version recheck, delete sequence. Inject mismatch, permission loss, destination success timeout, source mutation, and crash after verification. Source survives every unverifiable case; retry does not duplicate target. Real account confirms bytes. | M4; transfer journal unit tests, `cross-provider.spec.ts`. |
| 10 | Acknowledge five stages then kill the browser process using a persistent test profile; restart with same profile and compare manifests/bytes. Export, wipe, restore, compare all five and hashes. Inject crashes between OPFS write and IDB commit. Reject traversal/corrupt/oversized ZIPs transactionally. | M3; crash harness and `working-copy.spec.ts`. Context closure alone is not the only crash test. |
| 11 | Request observer covers page, popup, frame, Worker and SW paths; test exact host/port/scheme rejection and redirects. Seed recognizable fake credentials; inspect logs, DOM, Web Storage, cookies, history/URLs, cache and raw IDB for leaks. Ciphertext-only remember test, wrong-passphrase/idle-lock tests. Signed transfer URL exception must match approved policy and be redacted from artifacts. Run enforcing production CSP and real auth traces separately. | M1 baseline, M4 providers, M6 full security suite. |
| 12 | Controlled PDF has a unique phrase on page 12 and separated keywords elsewhere. Index cached PDF, query phrase, assert correct snippet/page and no false phrase match; open at page 12. Update version and verify stale hits disappear. Test cancellation, scanned/no-text, >150 MB skip and index-cap eviction. | M5; search units and `search.spec.ts`. |
| 13 | Axe on each screen, dialog, menu, viewer, empty/loading/error state, both themes and relevant responsive variants. Fail serious/critical findings; review lower severities. Keyboard connect, browse, multi-select, stage, review, confirm, push; focus survives virtualization and modal close. NVDA/VoiceOver logs cover grid/tree/live regions. | M0 onward, final M7 audit. Automated axe alone does not establish WCAG conformance. |
| 14 | Negative lint fixtures for literal color functions/hex outside tokens, all gradient forms, backdrop filters, extra shadows, banned fonts and em dashes. Styleguide snapshots plus Explorer, Size ledger and Pending screenshots. Recorded squint/grayscale/200% zoom/360px tests, no-logo identity review. | M0 rules, each milestone QA, M7 signed `docs/design-qa.md`. |
| 15 | Built-asset gzip report: shell <=150 KB, lazy viewer <=250 KB except named PDF core/worker. Production browser metrics: shell <=2.5s throttled, warm <=1s, cached PDF first page <=800ms. Trace 10,000-row scroll frame times, stage 100 files responsiveness, close PDF and measure memory within 20% baseline after settling. Log hardware/profile/repetitions and prohibit chunk splitting that hides dependency costs. | M1 baselines, M5/M6 integration, M7 CI and device report. |
| 16 | Compare complete namespace/key sets, interpolation/plural forms and missing-key fallbacks in en/hi. Static scan user copy/comments/docs for U+2014. Render longest Hindi labels, mixed paths and numbers; fluent reviewer checks meaning and glyph shaping. Include worker errors and extension strings. | M0 infrastructure, every milestone, M7 language sign-off. |
| 17 | Populate all DB stores, OPFS cache/staging, optional encrypted secrets, in-memory providers/workers, SW caches and second tab. Wipe while offline/idle and while work is active: cancel first, delete data, sign out Shelf sessions, broadcast invalidation. Reopen/reload and prove no stale worker restores data. Test deletion failure reports and recovery. Provider-origin cookies are outside Shelf's authority. | M1 minimal, M6 full `wipe.spec.ts`, M7 device pass. |
| 18 | 360px screenshots and interaction tests: Locations drawer, Inspector bottom sheet, focus/scroll containment, two-line file rows, sticky tray without covering content, 44px touch targets, long-press selection and named actions. Repeat Hindi, dark mode, landscape, safe-area inset, 200% zoom, software keyboard. No required drag operation. | M1 responsive shell, M4/M5 views, M7 full matrix. |

Additional release gates not fully captured by the 18: real provider scope/CORS checks; encrypted PDF split refusal; Local fallback; executable/symlink/submodule preservation; extension permission review; LFS feasibility/status; archive bomb limits; strict CSP content attacks; frozen-install and licence audit. None should be hidden merely because the numbered acceptance list omits it.

## 6. UI plan

### 6.1 Draft token values

This is a documentation draft for a future `src/styles/tokens.css`, not a product file. Literal values are centralized here to make the proposed palette reviewable. No gradient, decorative filter, or additional elevation is proposed. Explicit light/dark overrides take precedence over system theme; in implementation, emit one light token set and one dark set, with the dark system rule applying only when no override is present.

```css
:root {
  color-scheme: light;
  --paper-0: #E9ECE7; --paper-1: #F5F6F3; --paper-2: #FFFFFF;
  --ink-1: #1A1F1B; --ink-2: #444C46; --ink-3: #586257;
  --rule: #D2D7CF; --rule-strong: #778272;
  --accent: #1F5C8E; --accent-ink: #FFFFFF; --accent-tint: #DCE8F2;
  --ok: #24683F; --warn: #805100; --danger: #B3261E;
  --ok-tint: #E1F0E6; --warn-tint: #F6EAD0; --danger-tint: #F7DEDB;
  --provider-github: #2B2F2C; --provider-gdrive: #316A43;
  --provider-dropbox: #2B609C; --provider-onedrive: #875100;
  --provider-local: #5B6670;
  --elevation: 0 8px 24px rgb(20 28 22 / 18%);

  --font-ui: "Atkinson Hyperlegible Next Variable", "Noto Sans Devanagari Variable", sans-serif;
  --font-ref: "Atkinson Hyperlegible Mono Variable", "Noto Sans Devanagari Variable", monospace;
  --text-meta: 0.75rem; --text-dense: 0.8125rem; --text-ui: 0.875rem;
  --text-reading: 1rem; --text-title: 1.25rem; --text-empty: 1.75rem;
  --line-ui: 1.35; --line-reading: 1.5;
  --weight-normal: 400; --weight-medium: 500; --weight-strong: 600;
  --reading-measure: 72ch;
  --space-0: 0; --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px; --space-8: 32px;
  --pane-padding: var(--space-3); --dialog-padding: var(--space-5);
  --radius-flat: 0; --radius-control: 3px; --radius-layer: 6px;
  --radius-dot: 50%;
  --border-width: 1px; --border-high-contrast: 2px;
  --focus-width: 2px; --focus-gap: 2px;
  --row-compact: 28px; --row-default: 32px; --row-comfortable: 44px;
  --row-height: var(--row-default); --target-min: 24px;
  --target-touch: 44px; --viewer-toolbar: 40px;
  --icon-size: 16px; --icon-stroke: 1.5px; --pending-marker: 6px;
  --weight-rule-width: 40px; --weight-rule-height: 3px;
  --locations-width: 220px; --locations-min: 160px; --locations-max: 360px;
  --inspector-width: 320px; --inspector-min: 240px; --inspector-max: 520px;
  --palette-width: 560px;
  --thumb-small: 120px; --thumb-medium: 160px; --thumb-large: 200px;
  --quicklook-width: 70vw; --quicklook-height: 70vh;
  --motion-dialog: 100ms; --motion-response: 120ms; --motion-count: 150ms;
  --layer-base: 0; --layer-sticky: 1; --layer-menu: 10;
  --layer-dialog: 20; --layer-toast: 30;
}

/* Apply this same dark set for the system dark theme when no override exists. */
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper-0: #121513; --paper-1: #181C19; --paper-2: #212622;
  --ink-1: #E4E8E2; --ink-2: #B9C0B7; --ink-3: #939C91;
  --rule: #2C332D; --rule-strong: #7D887D;
  --accent: #7DB2E3; --accent-ink: #0E1A26; --accent-tint: #1F3447;
  --ok: #6FCB93; --warn: #E0A84A; --danger: #F2877F;
  --ok-tint: #1C2B21; --warn-tint: #2E2616; --danger-tint: #33201E;
  --provider-github: #B9C0B7; --provider-gdrive: #82C99B;
  --provider-dropbox: #86B8EB; --provider-onedrive: #E0B466;
  --provider-local: #A3B3C0;
  --elevation: none;
}
```

Semantic aliases in implementation: control-border and meter-track use `--rule-strong`; decorative pane separators use `--rule`. Hover uses `--paper-0`, pressed/selected uses `--accent-tint`, invalid controls use `--danger`, disabled text uses `--ink-3` without opacity reduction. Danger buttons use danger text on paper/danger-tint, not an untested inverted combination. Six tag categories use the accent/ok/warn/danger/ink-2/ink-3 palette with six distinct shapes and text labels. File-family tags reuse these tokens; do not introduce arbitrary new hues.

Density, coarse-pointer, reduced-motion, forced-colors, and explicit theme settings override tokens rather than per-component values. On touch, toolbar/controls are at least 44px and mobile row height may grow. Forced-colors remaps surface/text/border/focus tokens to Canvas/CanvasText/ButtonText/Highlight and removes elevation. CSS variables cannot be used as ordinary media-query breakpoints; centralize 640/900/1200px queries in an approved shared stylesheet or build-time definition, with lint preventing drift. Dynamic sizes use constrained, measured values; they do not bypass token policy.

### 6.2 Numeric contrast verification

Calculated locally with WCAG relative luminance: normalize sRGB channels; linearize with `c/12.92` at `c <= 0.04045`, otherwise `((c + 0.055)/1.055)^2.4`; luminance is `0.2126R + 0.7152G + 0.0722B`; ratio is `(Llighter + 0.05)/(Ldarker + 0.05)`. Values below are rounded only for display; future tests compare unrounded values. This is actual arithmetic on the draft, not visual estimation.

| Pair / minimum across paper-0, paper-1, paper-2 | Light | Dark | Required |
| --- | ---: | ---: | ---: |
| ink-1 / papers | 14.029 | 12.410 | 4.5 |
| ink-2 / papers | 7.440 | 8.268 | 4.5 |
| ink-3 / papers | 5.339 | 5.425 | 4.5 |
| accent / papers | 5.912 | 6.849 | 4.5 text, 3 focus |
| ok / papers | 5.634 | 7.795 | 4.5 |
| warn / papers | 5.692 | 7.230 | 4.5 |
| danger / papers | 5.483 | 6.262 | 4.5 |
| rule-strong / papers | 3.375 | 4.168 | 3 control boundary |
| ink-1 / accent-tint | 13.433 | 10.326 | 4.5 |
| ink-2 / accent-tint | 7.123 | 6.880 | 4.5 |
| ink-3 / accent-tint | 5.112 | 4.514 | 4.5 |
| accent / accent-tint | 5.661 | 5.699 | 4.5 text, 3 focus |
| accent-ink / accent | 7.048 | 7.828 | 4.5 |
| ok / ok-tint | 5.695 | 7.509 | 4.5 |
| warn / warn-tint | 5.686 | 7.024 | 4.5 |
| danger / danger-tint | 5.113 | 6.257 | 4.5 |
| GitHub mark / papers | 11.397 | 8.268 | 3 graphic |
| Drive mark / papers | 5.382 | 7.895 | 3 graphic |
| Dropbox mark / papers | 5.411 | 7.377 | 3 graphic |
| OneDrive mark / papers | 5.493 | 7.978 | 3 graphic |
| Local mark / papers | 4.922 | 7.155 | 3 graphic |

Original README light ok/paper-0 is **4.417**, warn/paper-0 **4.275**, and light rule-strong/paper-1 **1.832**. Original dark rule-strong/paper-2 is **1.672**. Those fail their intended text/control roles. The draft fixes these roles without changing the overall paper/ink identity.

Decorative rule/paper-1 is intentionally 1.348 light and 1.328 dark; it cannot identify an input, selectable state, essential chart axis, or focus indicator. Selection cannot rely on its tint contrast: pair it with a checkbox/selection mark and a passing focus outline. Primary-button focus uses a paper-colored gap then the accent outline so it remains visible next to the accent fill. No translucent overlay or opacity is applied to measured text. Dark ink-3 on selected rows has little margin; prohibit reducing its opacity.

Future contrast tests use an explicit semantic-pair registry, including hovered/pressed/selected states and composited backgrounds. Testing every arbitrary token against every other token is meaningless, since two background tokens are not a text pair. New pair usage must be registered and numerically verified.

### 6.3 Primitive state tables

Shared behavior: focus-visible means the two-pixel ring and gap, with no layout shift; disabled controls suppress action and expose native disabled/`aria-disabled`; loading preserves accessible name/width, exposes busy state and text progress, and prevents duplicate activation. Error always has text plus programmatic association. Selected uses semantic checked/selected/pressed state plus a shape or check, never tint alone. Hover-only affordances must also appear on keyboard focus and touch selection. N/A is explicit when a primitive has no interactive role; do not manufacture fake focus stops for decorative pieces.

| Primitive / variants | Default | Hover | Focus-visible | Active | Disabled | Loading | Error | Selected |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button: primary, secondary, quiet, danger | Accent fill/contrast label for primary; other variants text plus appropriate boundary | Underline or surface change, same geometry | Shared ring; gap on filled button | Pressed tint or text emphasis, no movement | Disabled semantics, ink-3, no action | Stable label and progress, busy | Adjacent error/status; never only red | Toggle-only `aria-pressed` plus check |
| IconButton | Named 16px glyph in >=24px target | Visible surface | Ring around target | Pressed surface | Named disabled control | Busy with accessible action name | Associated message | Toggle icon plus pressed semantics |
| Input | Persistent label, strong boundary, separate help | Strong boundary remains | Ring, caret, no placeholder-as-label | Editing/selection | Native disabled or explicitly readonly | Busy/validation message without erasing entered text | `aria-invalid`, danger boundary, linked error | Native text selection only |
| Select | Label, current value, disclosure glyph | Surface change | Ring; keyboard open | Open listbox, active option | Disabled trigger | Busy choices message | Linked field error | Check and selected option semantics |
| Checkbox | Named square, strong boundary | Surface change | Ring around box/target | Native press feedback | Disabled, checked value still legible | Busy parent action, prevent retoggle | Group/field message | Check; include indeterminate dash state |
| Kbd | Plain keycap with ink-2 text | N/A | N/A | N/A | Inherited explanatory text, not a control | N/A | N/A | N/A |
| Badge: neutral/info/ok/warn/danger | Text plus marker, tested text/tint pair | N/A for static badges | N/A; actionable chips use Button | N/A | Static meaning remains legible | Separate status text | Danger variant plus reason | Selection is a separate chip/control |
| Meter | Label, value, thresholds and track | Tooltip only when details exist | N/A for graphic; wrapper action is named Button | Wrapper opens ledger | Unavailable value says Unknown | Indeterminate progress uses Progress, not a fake meter value | Text error and no fabricated value | Range highlighting plus label, not interactive selection |
| Tooltip | Hidden until requested | Opens on trigger hover | Opens on trigger focus | Esc dismisses; no essential controls inside | Disabled wrapper can expose explanation | N/A | Content can explain error, not sole error channel | N/A |
| ProviderMark | Geometric shape and provider text | N/A | N/A; parent row/action owns focus | N/A | Parent connection status text | Parent status indicates connecting | Parent status says reconnect/error | Parent selection, mark retains shape |
| FileGlyph | Folded silhouette and extension/folder/fallback | N/A | N/A; file row owns focus | N/A | Parent unsupported action explanation | Thumbnail placeholder without shimmer | Broken-preview label outside glyph | Parent row checkbox/outline |

Button and IconButton variants are separately snapshotted. Select covers open/closed, empty, long options, active option, and async failure; Checkbox covers unchecked/checked/indeterminate; Input covers empty/filled/password/readonly/invalid. Pure display primitives receive every relevant parent state in context, not inappropriate standalone event handlers.

Composite contracts added before their screens:

| Composite family | Required states and interaction proof |
| --- | --- |
| Tree/FileTable/Grid/Columns | Loading, empty, populated, error, offline, virtual focus, single/range/multi-selection, sorted/resized columns, pending add/rename/delete, unsupported entries; roving grid/tree navigation and stable focus. |
| Breadcrumbs/AddressBar | Display/edit, completion list, invalid ref, long Unicode path, loading navigation, back/forward; Esc reverts and restores focus. |
| PendingTray/Review/Push | Empty, mixed providers, blocked, public, backup overdue, offline queued, pushing, cancelable, finalizing, partial success, conflict, failed, completed; live announcements never steal focus. |
| GuardStrip/RepoMeter/SizeLedger | All tiers including 95 MiB stop/100 MiB line, unknown quota, lagging size, >5 GiB override, multiline mobile copy; always text/shape meaning. |
| Inspector/Quick Look/Viewer | No selection, single/multiple, loading, unavailable, cached/offline, bad format, huge file; tabs and return focus; mobile sheet/fullscreen. |
| Dialog/Menu/CommandPalette/Toasts | Open/closed, keyboard focus, no results, busy/error, nested overlay return focus, reduced motion, forced colors; invalid context actions hidden and accessible alternatives present. |

### 6.4 Styleguide route layout and visual identity

`#/styleguide` is a development/test-only workbench. Its code and labelled sample data are removed from the production import graph, not merely hidden by a link.

1. Narrow left navigation: Tokens, Type, Primitives, Selection, Guards, Pending, Viewers, Responsive, Hostile/edge states. Main canvas uses pane rules, not cards. A utility bar selects theme, density, locale, pointer mode, direction, reduced motion, and state fixture.
2. Token section shows role-labelled swatches, numeric contrast pairs, font specimens including `I l 1 O 0`, Hindi names, long refs, sizes and hashes. Adjacent light/dark examples are for review; deterministic snapshots also render one theme at a time.
3. Primitive section is a labelled matrix: rows are primitive variants, columns are the eight named states. N/A cells explain why. Interactive scenarios exercise actual keyboard/ARIA states; static visual state fixtures are never mistaken for behavioral tests.
4. Composite section shows a realistic sample reading library, an 80-row virtualized slice plus a generated 10,000-row performance fixture, selected rows, a persistent Pending tray, guard strip and Size ledger. Use believable labelled sample filenames such as `operating-systems.week-03.pdf`.
5. Responsive section shows 360, 640, 900 and 1200px fixtures, long Hindi labels, drawers/sheets, 200% zoom, and keyboard-only flows. Browser-level forced-colors/reduced-motion runs are separate from visual toggles.
6. Snapshot matrix: two themes times three densities for each applicable fixture; additional Hindi, narrow, forced-color and reduced-motion coverage where behavior changes. Pin fonts, dates, viewport and animations. Render via a test build with production CSP; do not ship test bypasses.

Section 5's green-grey panes, blue action color, outlined icons and ordinary explorer structure can still look like a generic dashboard. Specific proposed fixes stay within its constraints:

- Make every GitHub Size cell a miniature measured ruler: common 40px scale, 50 and 95 ticks, named stop threshold, and aligned units. The Size ledger repeats exactly that geometry at larger scale, with 50/95/100 labels and a shared axis. This makes the visual identity come from the product's actual limit.
- Make the Pending tray read like a compact change record: fixed columns for operation shape, count, and byte delta; a flush Review control; full location label on expansion. It spans the shell and remains legible in grayscale, with no floating card or colored edge stripe.
- Give file glyphs a consistent folded-corner cut and extension baseline that aligns with the filename, rather than mixing stock file icons. Keep provider marks secondary to the document.
- Use an aligned ledger for Library recents/favorites/collections instead of a grid of identical cards. Empty states occupy the file-list area with a specific next action, never a centered greeting.
- At 360px, preserve the same ruler and operation shapes beside two-line filenames, with a compact always-visible guard sentence. Avoid collapsing the signature elements into an anonymous overflow menu.

## 7. Full [HUMAN] steps by milestone

These are owner actions before the relevant real-account check or milestone exit. Missing account setup does not block mock implementation, but it cannot be marked verified. No secrets should be pasted into this repository or this analysis. M0 will create SETUP.md with this list at the top and concrete deployment values once known.

| Gate | Owner actions | Exact values / completion evidence |
| --- | --- | --- |
| Before M0 | [HUMAN] Approve this analysis and the proposed requirement corrections. Confirm a local/CI Node version meeting the tool engines; establish the Git repository/remote if desired. Choose the temporary identity Shelf and retain MIT unless explicitly changed. | Working directory currently has only README.md and AGENTS.md before this task and is not a Git repository. No remote or commit was created. Node 24.19.0 was observed. M0 lint peer compatibility still needs engineering validation. |
| M0 exit | [HUMAN] Review Styleguide light/dark/density specimens, Hindi fallback, and the specific visual identity; approve intentional snapshots. Choose/confirm CI runner and reviewer access. | Recorded feedback and approved `docs/design-qa.md` evidence. No cloud OAuth app required. |
| Before M1 real check | [HUMAN] Create a throwaway initialized GitHub repo, add sample PDFs/text/images, and create a fine-grained PAT for selected test repos. Provide it only through Shelf's in-memory Connect input when implemented. Obtain organization approval if required. | Repository permissions Contents read/write and Metadata read. No broad classic PAT fallback. Include one public and one private test location and an empty repo fixture/account case when M3 is reached. |
| M1 exit | [HUMAN] Browse real repo, open PDF, reload deep link, validate private-file access and mobile layout. | Test account/results recorded without tokens or private filenames in public diagnostics. |
| Before M2 exit | [HUMAN] Review guard wording, size-unit explanation, public confirmation, sensitive-name wording, and both languages with available reviewer. | Large-file guards use locally generated samples; no oversized public upload is necessary. Confirm read-only 95 MiB stop and 5 GiB override semantics. |
| Before M3 real writes | [HUMAN] Designate disposable GitHub repo/branch for test commits, prepare protected branch/ruleset and empty-repo cases, and authorize test modifications there. Review split/initialization Push plans. | Confirm before/after commit count, no source loss on conflict, and working-copy backup restoration. Supply permissions through the app, never a VITE token. |
| Before M4 Drive connection | [HUMAN] Create Google Cloud project; enable Drive API and Picker API if Picker is included; configure OAuth branding/consent, audience, support contact, app homepage and privacy URL; register JavaScript origins and web client. If in Testing, add test accounts; before public release publish to production and complete any requested verification. | `VITE_GOOGLE_CLIENT_ID`; `VITE_GOOGLE_APP_ID` is project number for Picker; `VITE_GOOGLE_API_KEY` is an HTTP-referrer-restricted key restricted to needed APIs. Requested scope only `https://www.googleapis.com/auth/drive.file`. Supply actual dev/preview/production origins without wildcards. |
| Before M4 Dropbox connection | [HUMAN] Create Scoped access / App folder app; enable needed file scopes and account-info scope if quota/identity uses it; register exact callback URI; add development testers and apply for production approval before rollout. | `VITE_DROPBOX_APP_KEY`; proposed callback `<origin>/auth/dropbox/`. PKCE public client, no app secret in SPA. Confirm actual console acceptance when implementing. |
| Before M4 OneDrive connection | [HUMAN] Register Entra SPA for accounts in any organizational directory and personal Microsoft accounts; add delegated `Files.ReadWrite.AppFolder`; obtain tenant consent where policy requires it; register the actual callback. | `VITE_MS_CLIENT_ID`; proposed memory-popup callback `<origin>/auth/microsoft/`, replacing the generic root callback after validation. No client secret. Test with both a personal and a work/school account. |
| M4 security/setup gate | [HUMAN] Provide disposable accounts/storage for real upload, history, move and delete tests; approve exact observed Microsoft transfer hosts and narrowly documented signed-URL/COOP policy amendments. Review Google Picker trace if enabled. | Real screenshots/results prove app-folder limits, pagination, binary downloads, resumable uploads, hash mismatch handling and partial moves. Never approve an entire cloud wildcard from one observation. |
| M4 advanced LFS gate | [HUMAN] Only if advanced LFS is to be enabled, designate an already LFS-configured disposable repo and review storage/bandwidth implications. | Engineering first proves transport/CORS/auth/host feasibility. If unavailable, no account spending or silent scope expansion; mark write path unfinished. |
| Before M5 exit | [HUMAN] Test offline PDF reload, pinning and backup on a representative Android phone and iOS device. Optionally choose a location for roaming collections and opt in through staged sync. | No new OAuth scopes. Confirm browser storage limitations and that local-only tags/collections are acceptable by default. |
| Before M6 GitHub OAuth | [HUMAN] Create/install GitHub App on test repos; set Contents read/write, Metadata read, request user authorization during installation on, and user token expiration on. Register callback and client ID. | `VITE_GITHUB_APP_CLIENT_ID`; proposed `<origin>/auth/github/`. Worker secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; PKCE enabled in client flow. Any additional signing/rate-limit binding configuration is documented at implementation, not guessed now. |
| Before M6 hosting/Worker | [HUMAN] Create Cloudflare Pages project and Worker or equivalent static-host arrangement; configure exact allowed app origin, Worker origin, secrets through secret management, and platform rate limiting. Verify the static host serves `_headers` and callback/privacy pages. | `VITE_OAUTH_WORKER_URL` is only the origin/configured base URL, not a secret. Deploy development/preview/production origins deliberately; do not leave `<WORKER_ORIGIN>` in shipped CSP. No Worker access logs containing codes or tokens. |
| Before M6 privacy and extension checks | [HUMAN] Review the public privacy statement, test PWA installation/update on iOS/Android, and load the MV3 extension unpacked for review. Decide whether public store distribution is included; if publishing, own the store account/listing and review permissions. | `/privacy` must be reachable before consent configuration is finalized. Extension implementation remains M6 scope even if distribution is deferred explicitly. |
| Before M7 release | [HUMAN] Select final name/domain and perform name/trademark/domain checks as appropriate; confirm licence/copyright attribution; update OAuth origins/callbacks and privacy pages to final URLs. Name a fluent Hindi reviewer and accessibility reviewers with NVDA/VoiceOver access. | Final name/domain and account-specific IDs are currently unknown, so no fictitious exact values are supplied. Hindi and manual accessibility sign-offs are required. |
| M7 exit/publication | [HUMAN] Complete throwaway-account passes for all four providers, manual 100 MB/public guards, 360px/zoom/grayscale/squint/no-logo review, iOS install, device performance, backup/wipe, and privacy/permissions review. Complete Google/Dropbox/tenant approvals still pending. Approve release checklist and any explicitly deferred requirement before publication. | Record devices/browser versions, approved screenshots and issue dispositions in `docs/release.md`/`docs/design-qa.md`. Publication is a separate action and is not performed by this task. |

## 8. Blocking questions and stopping point

**No blocking questions for this analysis.** Safe proposed defaults and unverified integration gates are recorded above. Exact account identifiers, domain names, production approvals, and device-review ownership can be supplied at their milestone gates rather than stopping this planning task.

The next authorized action is owner review of these documents. No milestone has started. M0 begins only after approval; its first technical gate is a supported, tested dependency/lint configuration. This analysis does not claim a working app, a passing `npm run check`, or real-provider verification.
