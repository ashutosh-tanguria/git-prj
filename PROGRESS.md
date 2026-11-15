# Shelf progress

Updated: 2026-11-16 (Asia/Calcutta).

## Status

The owner approved the analysis and all its proposed ambiguity resolutions. M0 foundation is implemented. M1 has not started. Local verification is green; the foundation is ready for owner review.

| Work | Status | Evidence / next gate |
| --- | --- | --- |
| Planning analysis | Done, approved | docs/ANALYSIS.md resolutions govern implementation. |
| M0 Foundation | Done | Tokens, self-hosted fonts, 11 primitive families, state gallery, contrast/design-policy tests, browser snapshots, axe and CI. |
| M1 Shell and GitHub read | Not started | Requires owner authorization. |
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
