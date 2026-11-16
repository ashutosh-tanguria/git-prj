# Shelf progress

Updated: 2026-11-16 (Asia/Calcutta).

## Status

The owner approved the analysis and all its proposed ambiguity resolutions. M0 foundation is implemented. M1 read-path implementation is in progress and remains partial. Local verification is green; the foundation is ready for owner review.

| Work | Status | Evidence / next gate |
| --- | --- | --- |
| Planning analysis | Done, approved | docs/ANALYSIS.md resolutions govern implementation. |
| M0 Foundation | Done | Tokens, self-hosted fonts, 11 primitive families, state gallery, contrast/design-policy tests, browser snapshots, axe and CI. |
| M1 Shell and GitHub read | Partial | Read path and mocked browser flows implemented; full behavior and real-account exit check remain incomplete. |
| M2 Guards | Not started | Requires M1 exit and authorization. |
| M3 Staging and push | Not started | Requires M2 exit and authorization. |
| M4 Other providers and moves | Not started | Requires M3 exit and account setup. |
| M5 Library features | Not started | Requires M4 exit and authorization. |
| M6 Platform | Not started | Requires M5 exit and hosting/OAuth setup. |
| M7 Release | Not started | Requires M6 exit and all release reviews. |

## Decisions

- Implemented tokens first, primitives second, then #/styleguide in development and explicit styleguide test builds only. Production import elimination is checked by the bundle script. No Explorer or provider implementation is included.
- Applied approved contrast corrections, dark provider marks and the local Hindi font fallback. A semantic-pair registry compares actual tokens numerically rather than every meaningless background/background pair.
- Fixed hover/focus/pressed fixtures coexist with real accessible controls. Display-only states are explicitly non-applicable. Native Select handles its OS popup; React Aria handles Button, Checkbox and Tooltip behavior.
- Used TypeScript 6.0.3 for the approved peer compatibility exception. ESLint remains supported 10.15.0, with a scoped npm override for jsx-a11y's peer resolution. All recommended rules execute; positive/negative regression fixtures verify the integration.
- Overrode only typescript-estree's minimatch to 11.0.1 for GHSA-g3hv-75wg-m249. No force/legacy-peer-deps flags or lifecycle scripts are enabled.
- Development/build downloads are distinct from the production host policy, as approved in analysis. Browser tests observe same-origin-only runtime requests and preview serves an enforcing CSP.
- CI uses Windows to match committed visual baselines. M7 owns the full three-engine release matrix. No cloud workflow or deployment was triggered from this local task.
- Initialized a local Git repository to satisfy the explicit commit request; no remote was created or contacted.

## Not done

| Item | Reason / next milestone |
| --- | --- |
| M1 and subsequent product features/composites | Explicit task boundary. |
| Real-account/provider/OAuth checks | No provider code or credentials in M0. |
| Independent owner visual approval and fluent Hindi copy review | Owner review of captures; final language pass M7. |
| Explorer/Pending tray identity review | Needs real components in later milestones; no fabricated screenshots. |
| Firefox/WebKit, NVDA/VoiceOver and device QA | Release gates in M7; M0 Chromium/axe checks are local. |
| CI execution on a remote repository | Workflow committed locally; remote not configured. |
| README prose rewrite | Approved analysis is retained as the resolution record; source text was not silently rewritten. |

## Manual steps

[HUMAN] Review docs/design-qa.md and the light/dark captures; approve the primitive baselines and authorize M1 when ready. Choose a repository remote to enable CI. No OAuth app, secret or deployment is required for M0.

All later account setup, exact permission/callback templates and device gates are in SETUP.md and docs/ANALYSIS.md section 7. Supply secrets only through the relevant app/secret manager when those features exist.

## Known issues

- jsx-a11y does not yet declare ESLint 10 in its upstream peer range; the scoped override is tested locally and in CI and should be removed when upstream support lands. TypeScript and minimatch overrides are documented in docs/dependencies.md.
- Browser snapshots depend on Windows font/browser rendering. Deliberate visual changes require review before baseline updates.
- Hindi strings are present and glyphs render, but have not received a fluent independent review.
- WOFF2 font assets include all supplied script subsets; no external font requests occur. Future performance work may subset further without removing Hindi coverage.
- Real provider, LFS, signed-URL/CSP and multi-commit issues remain documented in ANALYSIS.md; no M0 code claims to resolve their runtime behavior.

## Validation

- Clean npm ci with lifecycle scripts disabled: passed.
- npm run check: passed, including typecheck, ESLint, Stylelint, 101 unit checks, production build and bundle budget.
- npm run test:e2e: nine Chromium scenarios pass, including six unchanged theme/density snapshot baselines, keyboard, Hindi/360px/forced-colors/200% zoom and tooltip/review captures.
- npm audit: zero vulnerabilities. Locked-licence allowlist: passed.
- Production JS: 67,689 gzip bytes by scripts/check-size.mjs, below 150 KB; no Styleguide/sample import.
- Actual light/dark, grayscale, squint and zoom captures inspected and recorded in docs/design-qa.md.
- Local conventional commit requested by owner; no remote push or M1 work.

## M1 checkpoint (2026-11-16)

Status: Partial. M2 has not started.

Decisions: GitHub PAT is held only in module memory, cleared on authentication failure/disconnect, and never persisted. All requests pass one HTTPS API-origin boundary and reject redirects. UI uses a library service. Listings traverse non-recursive Git trees by subtree SHA, preserving special-entry read-only status. Refs encode branch/path components, including branch slashes. No write API is exposed. Markdown removes active content and images and opens external links with noopener/noreferrer. Relative Markdown assets currently fail closed. Code highlighting uses a limited grammar list and the same sanitizer. PDF core/worker are self-hosted and lazy, use canvas plus text layer, and never execute document actions. The installed PDF.js 6 typings no longer list isEvalSupported; the compatibility flag is passed but must not be treated as proof that the old switch still exists.

Built: shell, hash routes, memory PAT validation and repository pagination, Locations tree, virtualized selectable/sortable file rows, editable address, Quick Look modal, basic PDF/image/Markdown/code views, download/copy-link actions, fixed guard strip, empty Pending tray, status bar, Styleguide specimens, unit/component/MSW browser tests. Production translations no longer import Styleguide sample copy.

Not done within M1: full PDF continuous/single-page modes, outline/thumbnails, fit controls, search/highlights, saved page/zoom; full image pan/zoom; code line numbers/wrap/copy; same-provider relative Markdown assets; Inspector; resizable/collapsible persisted panes and mobile drawer/sheet; full table headers/column sizing/chooser/persistent sort and multiselection; complete keyboard maps/address completion/Quick Look sibling navigation; progressive last-change metadata, private/public badge, complete loading/error/offline states and error boundary. Additional media/CSV/HTML behavior from the approved analysis is not implemented. The provider currently exposes a read-only subset rather than the full future StorageProvider write/history contract. These are unfinished requirements, not approved scope reductions.

Manual steps: [HUMAN] Supply a disposable initialized repository and fine-grained PAT through the app, then verify private/public repository browsing, a real PDF and deep-link reload. No credential was available in this task. Do not put the token in chat, VITE variables or a file. Fluent Hindi and independent accessibility/device reviews are still pending.

Known issues: the full Explorer does not yet meet acceptance 13/18, and PDF narrow-layout text alignment needs review. Guard copy is present, but actual guards remain M2. Remembered tokens/offline caching/wipe behavior remain their planned milestones; this checkpoint only proves memory-only reconnect after reload. No claim of a completed real-account exit test or full M1 completion is made.

Validation: npm run check passes with 108 unit/component tests; MSW browser tests exercise light/dark browse, Markdown, Quick Look, PDF canvas and deep-link reconnection. Full Styleguide snapshot refresh and final validation results are recorded with the checkpoint commit. Audit reports zero vulnerabilities; locked licence check passes. Screenshots and review limits are in docs/design-qa.md.

Final checkpoint verification: npm run check passed with 108 tests; npm run test:e2e passed all 11 scenarios without updating snapshots. Tests now run one Vitest worker at a time; simultaneous local browser/unit runs had caused resource-related startup timeouts. No tests were skipped or removed. Shell JS is 151,814 gzip bytes, below the 153,600-byte budget. Licence validation passed. M1 remains Partial for the unfinished requirements above.
