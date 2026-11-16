# Shelf progress

Updated: 2026-11-16 (Asia/Calcutta).

## Status

The approved analysis governs ambiguities. The requested M1 implementation is complete locally. Its real-account exit check remains an owner-run gate and has not been claimed as verified. M2 has not started.

| Work | Status | Evidence / next gate |
| --- | --- | --- |
| Planning analysis | Done, approved | docs/ANALYSIS.md |
| M0 Foundation | Done | Tokens, fonts, primitives, Styleguide, contrast/policy checks, snapshots and CI. |
| M1 Shell and GitHub read | Implementation done; real-account verification pending | Full selection/grid, tree/keyboard, PDF reader, Inspector, responsive panes, local preferences and mocked browser tests. Owner follows docs/manual-test-m1.md. |
| M2 Guards | Not started | Owner authorization required. |
| M3 Staging and push | Not started | M2 exit and authorization required. |
| M4 Other providers and moves | Not started | M3 exit and provider setup required. |
| M5 Library features | Not started | Cache, offline integration, search, collections and alternate views remain here. |
| M6 Platform | Not started | OAuth, hosting, extension, PWA, Settings and Privacy remain here. |
| M7 Release | Not started | Full release, device, screen-reader and language reviews remain here. |

## Decisions

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
- Viewer controls reflow with the shared shell instead of forcing every action into one fixed 40px toolbar. Pane resizing uses named width sliders rather than draggable pane-edge handles. Table dividers do support drag and keyboard resizing. These are remaining presentation differences, not hidden functionality claims.
- All new composites and reader specimens are in the development/test Styleguide. Samples are labelled and excluded from production. Fonts remain self-hosted. No dependency, runtime host, credential mode, budget exception or subsequent milestone was added.

## Not done

| Item | Reason / next gate |
| --- | --- |
| Real GitHub account, actual 20 MB/50-page document and deep-link exit verification | Owner must supply a disposable repo/PAT through the app. Checklist is docs/manual-test-m1.md. Mock fixtures are not real-account evidence. |
| Independent browser-menu zoom, mid-range phone 10,000-row/60fps and memory measurements | Automated virtualization/reflow checks do not prove physical-device performance. Release/device gate remains pending. |
| NVDA/VoiceOver, fluent Hindi review and full Firefox/WebKit matrix | Manual/release gates; local Chromium and axe are not WCAG certification. |
| Remote CI execution | Workflow exists, but no Git remote is configured. No push/deployment was performed. |
| Actual guards, staging, History, push, backup, cache/offline reload, other providers and alternate views | Assigned to M2 through M6; deliberately not started. |
| Script-enabled HTML preview | Disabled under the stronger security policy; documented deviation. |

## Manual steps

[HUMAN] Follow docs/manual-test-m1.md with a throwaway initialized repo and short-lived fine-grained PAT. Verify public/private browsing, a real PDF, page/zoom persistence after reconnection, deep links, keyboard and mobile width. Never send the token in chat or commit it. Revoke it afterward and record the result without credentials.

[HUMAN] Review the new Explorer/Inspector/PDF/360px captures and intentional Styleguide baselines in docs/design-qa.md. Review the bounded-preview and scriptless-HTML choices above. Configure a Git remote if CI should run remotely. Authorize M2 separately when ready.

## Known issues and limits

- Real provider CORS/large-file/font/codec combinations remain unverified until the checklist is run. Password-protected, damaged or unsupported PDFs show an error plus Download; no password prompt is implemented.
- GitHub per-item commit metadata can consume API quota. Only mounted rows request it, results are briefly cached, and unavailable metadata stays Unknown. Deep-link metadata failure does not discard successfully loaded bytes.
- Preferences are optional and can be removed by private browsing/storage clearing. A branch/path key intentionally follows that file across content updates. No offline file-byte cache is claimed.
- The jsx-a11y ESLint peer override and TypeScript/minimatch compatibility choices from M0 remain documented in docs/dependencies.md. No new packages were installed.
- Screenshot baselines depend on Windows Chromium. Changes were reviewed locally; independent owner visual approval remains pending.

## Validation

Local completion results: npm run check passes with 117 unit/component checks, type/lint/style/contrast/policy checks, production build and the unchanged 153,600-byte gzip shell limit. The full 25-scenario Chromium suite passed without snapshot updates. Subsequent focused mobile PDF runs passed after strengthening render-completion, pixel, visible-text and focus assertions. The fixed-date Hindi/360px baseline was also verified. npm audit found zero vulnerabilities and the locked-licence check passed. No test was skipped or deleted to get green. Acceptance 5, the M1 portion of 11/13/14/15/16/18, and the read-only exit flow are covered locally. Acceptance 8's offline reload is M5 and is not claimed by merely remembering a page.

Completion QA note: narrow/short-height PDFs start with a collapsible controls disclosure so document pages retain usable space. The / shortcut opens search; fit actions collapse controls on those viewports. At short desktop heights the shared chrome becomes compact without hiding controls or bottom status bands.

Final evidence: Windows Chromium screenshots for selection/Inspector, PDF, 360px list/sheet/PDF, grayscale, squint and 200% layout are in docs/design-qa.md. No real-account or physical-device verification is claimed. A conventional local commit completes this task; no remote push or M2 work.
