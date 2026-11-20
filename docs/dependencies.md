# Dependency decisions

M0 has seven direct runtime packages, below the 40-package budget. All versions are exact and the lockfile is committed; lifecycle scripts are disabled. No analytics, remote font service or provider SDK is installed.

| Package | Reason |
| --- | --- |
| react | UI composition and local control state. |
| react-dom | Browser rendering. |
| react-aria-components | Unstyled accessible Button, Checkbox and Tooltip behavior. |
| i18next | Local English/Hindi dictionaries without remote backend. |
| @fontsource-variable/atkinson-hyperlegible-next | Self-hosted readable UI face. |
| @fontsource-variable/atkinson-hyperlegible-mono | Self-hosted paths and refs face only. |
| @fontsource-variable/noto-sans-devanagari | Self-hosted Hindi glyph fallback approved in analysis. |

Build/test tools: Vite for local/build bundling; TypeScript for strict types; ESLint and typescript-eslint for code rules; jsx-a11y for accessibility lint; Stylelint plus the local shelf/tokens-only plugin for design policy; Prettier for formatting; Vitest for numerical contrast, lint-policy, locale and peer compatibility regression tests; Playwright for browser behavior/snapshots; axe-core Playwright integration for accessibility; @types packages for compile-time declarations. No test/build dependency is shipped to the product.

Compatibility deviations: TypeScript 6.0.3 stays within typescript-eslint's supported range. ESLint 10.15.0 stays supported; npm override replaces only jsx-a11y's ESLint peer resolution. All recommended jsx-a11y rules are enabled and the suite tests an actual positive/negative alt-text case. No force or legacy-peer-deps install flag is used. typescript-estree's minimatch is overridden to 11.0.1 to address GHSA-g3hv-75wg-m249; the parser/lint tests exercise that integration. Revisit both overrides when upstream ranges change.

npm audit and an explicit locked-licence allowlist run in CI. Font licences are retained inside their installed packages and bundled notice source is recorded in docs/font-licenses. Exact installed versions are in package.json/package-lock.json; latest registry verification is documented in ANALYSIS.md.

## M1 additions

- @tanstack/react-virtual: bounded visible file rows.
- pdfjs-dist: locally bundled PDF parser/rendering core and matching worker, lazily loaded.
- marked: local Markdown parsing, always sanitized.
- dompurify: single content sanitization boundary for Markdown and highlighted code.
- highlight.js: core with JavaScript/TypeScript grammars; no full grammar bundle.
- msw (development): deterministic GitHub HTTP contracts and browser test bridge; no production worker/mock entry. Version 3 uses onUnhandledFrame.
- Testing Library React/DOM/user-event (development): component interaction checks.
- jsdom (development): DOM environment for component and sanitizer checks.

Runtime packages remain below 40. Exact versions are pinned in package.json. PDF and sanitized text/highlighting are separate lazy chunks; the shell budget includes entry and Library chunks. The PDF core/worker exception is explicit, rather than treating every lazy component as exempt.

## M1 completion choices

No dependencies were added for this completion. IndexedDB stores only non-secret table, pane and reading preferences; the existing memory-only token boundary is unchanged. APG tree and Inspector tabs are small local components with roving focus and browser/axe coverage. Replacing the general React Aria Tree/Tabs implementations recovered the measured shell budget; React Aria still supplies Button and modal focus management. This is a dependency-size choice, not an accessibility exemption.

CSV parsing/virtualization and native media are local lazy readers. HTML preview uses the same sanitized source reader plus an opaque, scriptless sandbox with an explicit deny-all resource policy. The shell budget still counts all non-PDF/non-sanitized-text JavaScript, including the new media and table chunks; no size threshold or exclusion was changed.

M3.5a adds no runtime package. Static previews use a separate Vite build with native Service Worker and MessageChannel APIs; media uses native HTML playback, streaming fetch, OPFS and IndexedDB. Tier 2 LibreOffice WebAssembly, Tier B WebContainers and Tier C Pyodide are deferred by owner decision, so no engine asset, package-registry host, engine licence claim or download was added. Preview UI and media-cache services stay lazy under the existing shell/viewer budgets.

## M3.5b dependency preparation

The owner supplied SheetJS CE 0.20.3 as `vendor/xlsx-0.20.3.tgz`, installed by a local file dependency. Its approved SHA-256 is `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`; a test checks the exact bytes. Its licence is Apache-2.0. The spreadsheet parser is restricted to a sandbox-origin worker with a 50 MiB input cap, 20-second deadline and limited read options. This is preparation, not a claim of a completed viewer or security review.

Registry metadata reports docx-preview 0.4.1, Apache-2.0, published 2026-09-21, with jszip dependency; pptx-preview 1.0.7, ISC, published 2025-10-17, with jszip, lodash, tslib, uuid and echarts dependencies. On 2026-11-18 `npm audit --omit=dev` reported zero high or critical findings and three moderate package findings, including ECharts XSS and uuid bounds-check advisories via pptx-preview. The owner accepts these moderate findings under the no high or critical rule; revisit them when upgrading pptx-preview or its dependencies. The full audit timed out and was not repeated. CSP review and hostile-document isolation testing remain pending; this acceptance does not establish renderer isolation.
