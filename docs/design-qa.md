# Design QA

Reviewed 2026-11-16 (Asia/Calcutta). The M0 record and initial M1 checkpoint below are historical; the M1 completion review is the current result. Reviewer: Codex, by inspection of actual Chromium captures. This is not an independent human, screen-reader or device sign-off.

## Scope and state specification

Tokens were implemented before primitives; the Styleguide was composed afterward. The primitive state contracts are in approved ANALYSIS.md section 6.3. Button has primary, secondary, quiet and danger variants; IconButton, Input, Select and Checkbox show default, hover, focus-visible, pressed, disabled, loading, error and selected fixtures. Native text selection belongs to Input; selected tint is a visual specimen. Real field errors use aria-invalid and linked messages. The gallery's button/checkbox error captions are fixture explanations, not live validation from a service.

Kbd, Badge, Meter, ProviderMark and FileGlyph are display primitives without fabricated interaction stops. Their non-applicable interaction states are explained on the page. Badge covers every verdict; Meter shows 14/30/70/95/100 and unknown values; ProviderMark shows all five shapes; FileGlyph covers PDF/MD/PNG/MP4/ZIP/code/folder/unknown. Checkbox also shows indeterminate, Input readonly/password, Select empty/long options. Tooltip is tested closed, open on hover and keyboard focus, and dismissed with Escape; open tooltip captures cover both themes. Native Select delegates its popup, keyboard navigation and active-option presentation to the browser/OS rather than drawing an inaccessible custom list.

The fixed data-preview examples are visual fixtures. The separate interactive controls and Playwright tests exercise actual native/React Aria focus, keyboard, disabled, checked and tooltip behavior. All content is labelled sample and imported only in development/test builds. No fake provider or working-copy service exists.

## Captures and reviews

| Review | Result and evidence |
| --- | --- |
| Light and dark | Reviewed paper/ink hierarchy, control borders, selection and focus examples. [Light](screenshots/styleguide-light.png), [dark](screenshots/styleguide-dark.png). Full-page matrix captures for light/dark times three densities live in e2e/snapshots. |
| Squint | At a two-pixel inspection blur, title, section divisions, control clusters and primary actions remain distinguishable. Quiet actions recede as intended. [Light](screenshots/styleguide-light-squint.png), [dark](screenshots/styleguide-dark-squint.png). Blur is injected only by the review test and is never product styling. |
| Grayscale | Outlines, underlines, check marks, labels and provider silhouettes keep their meaning. Status chips say Ready/Confirm/Blocked and do not rely on hue. [Light](screenshots/styleguide-light-grayscale.png), [dark](screenshots/styleguide-dark-grayscale.png). |
| 200% zoom | Browser page CSS zoom 2 at 720 by 500 viewport, effectively 360px layout width; Hindi sample and all primitives reflow without horizontal page overflow. Layout wrapping was corrected after an initial failing assertion. [Full capture](screenshots/styleguide-zoom-200.png). This is automated page zoom simulation, not a claim of a manual browser-menu zoom check. |
| 360px | Hindi labels and controls wrap; matrix becomes a vertical state list, with no overlapping content or horizontal document overflow. Full baseline: e2e/snapshots/hindi-360.png. |
| Contrast | Numerical WCAG semantic-pair registry tests both palettes, normal/selected/tint text, provider marks and essential control boundaries. Text minimum 4.5:1, non-text minimum 3:1. Decorative rules are deliberately excluded from essential-boundary usage. Approved corrections and ratios are in ANALYSIS.md section 6.2. |
| Accessibility | Axe serious/critical gate across all six theme/density combinations; actual keyboard checkbox, editable field and tooltip behavior; forced-colors/reduced-motion browser coverage. Automated axe is not complete WCAG certification. |
| Typography | Atkinson Next and Mono are local WOFF2; Hindi specimen renders with local Noto Sans Devanagari. Paths alone use Mono. Weight 400/500/600; tabular sizing is available for future table components. |
| Anti-template | No cards, decorative gradients, blur/glass, ambient motion, emoji, stock file icons, banned primary fonts, uppercase eyebrow headings, colored edge stripes or repeated shadows. Floating Tooltip alone uses the elevation token. File silhouettes and provider shapes are drawn locally. |
| Product identity | The measured file-weight ruler with 50/95 ticks previews Shelf's limit language. Primitive alignment and the folded file tag are specific design decisions. A full product identity/no-logo assessment requires the M1 Explorer and later Pending tray; those screens are deliberately not built in M0. Independent owner feedback remains welcome before M1. |

## Token exceptions and implementation choices

- Approved contrast changes and self-hosted Hindi fallback are implemented. Native Select/inputs provide robust baseline behavior; React Aria supplies unstyled Button/Checkbox/Tooltip behavior.
- Responsive breakpoints live in the shared Styleguide CSS module; CSS variables cannot be media-query breakpoints. All component color, spacing, radius and elevation values use tokens. Measured Meter percentage is a bounded data value, not a one-off spacing constant.
- Forced-colors overrides use system colors inside tokens.css. Vendor font/React Aria assets are exempt from authored-style lint; the runtime built workbench still runs under enforcing same-origin CSP.
- Test-only review filters are absent from production code. Production bundle guard proves the Styleguide and labelled sample text are excluded.
- Snapshot platform is Windows Chromium, matching CI. Firefox/WebKit and screen-reader/device release passes remain M7 scope.

## Remaining human review

[HUMAN] Review the captured states, typography, Hindi wording and desired density; approve intentional baselines before later milestone visual changes. A real Explorer squint/grayscale review and an independent no-logo identity review follow when those components exist. No screenshots or notes here claim those future screens have been evaluated.

## Historical M1 read-path checkpoint (2026-11-16)

Actual MSW-backed Explorer and Viewer captures: [Explorer light](screenshots/explorer-light.png), [Explorer dark](screenshots/explorer-dark.png), [Markdown light](screenshots/viewer-light.png), [Markdown dark](screenshots/viewer-dark.png), [PDF light](screenshots/viewer-pdf-light.png), [PDF dark](screenshots/viewer-pdf-dark.png). These contain labelled sample document content, not a live private account.

Reviewed pane rules, full-row selection, font readability and static guard-strip placement. The read path has no remote mutation controls. PDF pages remain their document's original paper color in dark mode; surrounding chrome uses dark tokens. Styleguide now includes the read composites and a text-viewer specimen; snapshots intentionally grow to include those sections. The tooltip test now selects its own trigger unambiguously, and the PDF test targets its labelled page canvas rather than PDF.js's private measurement canvas.

That checkpoint was a partial M1 visual implementation, superseded by the completion review below. Inspector and mobile drawer/bottom-sheet behavior, column headers/resizing/chooser, complete shortcut and focus behavior, and the full signature ruler treatment are not ready for sign-off. The narrow Styleguide reflow test is not evidence that the full Explorer satisfies acceptance 18. No claim of full Explorer WCAG certification, phone performance, or manual screen-reader review is made.

## M1 completion review (2026-11-16)

Reviewer: Codex, by inspecting actual Windows Chromium/MSW captures. No real-account, independent owner, physical-device, browser-menu zoom or manual screen-reader sign-off is claimed. The throwaway account checklist is [manual-test-m1.md](manual-test-m1.md).

| Screen / review | Evidence and observed result |
| --- | --- |
| Explorer selection and Inspector | [Light](screenshots/m1-selection-inspector-light.png), [dark](screenshots/m1-selection-inspector-dark.png). Selected rows retain checks as well as tint. Count/known byte total agree with the fixture. Folded 16px file glyphs fit within density rows. The rule separating panes, sticky headers and small file-weight ruler remain visible. |
| PDF | [Light](screenshots/m1-pdf-light.png), [dark](screenshots/m1-pdf-dark.png). Local sample page seven contains the search phrase and an internal outline destination. Search emphasis aligns with selectable PDF text. Controls, thumbnails and paper remain separate from shell chrome; document paper stays white unless reading mode is chosen. Controls reflow and can be collapsed, initially collapsed on narrow/short viewports. |
| 360px selection | [Light list](screenshots/m1-mobile-list-light.png), [dark list](screenshots/m1-mobile-list-dark.png). Name/size occupy two lines. Selection actions are reachable without drag and drop. Pending, the required guard sentence and connection status remain visible. No horizontal document overflow is observed. |
| 360px PDF | [Light](screenshots/m1-mobile-pdf-light.png), [dark](screenshots/m1-mobile-pdf-dark.png). Fit-width capture waits for actual page rendering, with collapsed controls leaving reading space. Fit controls are disabled until the document is ready and return focus to the disclosure after collapsing. |
| 360px Inspector sheet | [Light](screenshots/m1-mobile-light.png), [dark](screenshots/m1-mobile-dark.png). Details wrap long refs, the sheet scrolls, and Close remains available. Keyboard tests verify focus trapping, Escape and return to the Inspector trigger. Locations uses a separate drawer. |
| Squint | [Light](screenshots/m1-selection-light-squint.png), [dark](screenshots/m1-selection-dark-squint.png). With a test-only two-pixel blur, selected rows, file-list boundary, Inspector, address and bottom status bands remain distinct. Thin decorative rules recede; selected blocks and checks carry the main structure. No blur is shipped as product styling. |
| Grayscale | [Light](screenshots/m1-selection-light-grayscale.png), [dark](screenshots/m1-selection-dark-grayscale.png). Selection remains identifiable through checkboxes and row tint; the selected Details tab has weight and an underline. Metadata and guard copy retain readable hierarchy without relying on hue. |
| 200% layout review | [Light](screenshots/m1-zoom-200-light.png), [dark](screenshots/m1-zoom-200-dark.png). Browser context uses a 720 by 500 CSS-pixel viewport at 2x device scale, producing a 1440 by 1000 capture. This simulates the available layout/text scale of 200% zoom; it is not a browser-menu zoom verification. Short-height chrome becomes compact, several file rows remain usable, and guard/status lines stay visible. Wide table columns scroll inside the grid. |
| Keyboard and focus | Unit/component selection checks plus keyboard-only browser connect/browse, tree navigation, virtual row navigation, Quick Look focus restoration, address/parent/history, pane toggles and PDF keys. The deferred focus race found during review was corrected. Global focus tokens remain in use. |
| Four breakpoints | Browser tests cover 1440, 1024, 768 and 360 CSS pixels, including Inspector default collapse, Locations rail/drawer and Inspector sheet. Touch long-press enters selection mode; movement cancels long-press so scrolling works. |
| Automated accessibility | Axe serious/critical gate covers Styleguide theme/density states, Explorer across four bands, Inspector sheets, PDF and image reading. Native media and inert HTML/CSV browser flows are tested under enforcing CSP. These checks do not establish complete WCAG conformance. |
| Contrast and design policy | The semantic contrast registry and banned-style tests still pass both palettes. New controls use existing audited token pairs. Native checkbox/range accent now uses the accent token. No new color literals outside tokens, gradient, backdrop filter or stray shadow was introduced. |
| Styleguide | Inspector empty/single/multi Details, pane overlays, virtual table and Code/Image/PDF/CSV/HTML/Media specimens are labelled samples. Six light/dark/density and Hindi narrow baselines intentionally include the added read composites. Sample bytes and workbench imports remain absent from production. |

The shell now reserves space for Pending, guard and status bands; file/PDF scrolling stays inside reading panes. The product keeps the ledger-like table and small measured weight rule rather than adding cards or decorative panels. The full Size ledger remains M2, so its visual identity has not been claimed here.

Remaining deviations: viewer actions use reflowing shared shell chrome rather than one fixed 40px toolbar; pane widths use named sliders. HTML runs only as sanitized, scriptless, resource-free content in an opaque sandbox. Text previews are bounded at 10 MiB and Markdown images at ten. These choices and the account/device gates are recorded in PROGRESS.md and HELP.md.

[HUMAN] Review these captures and perform real browser-menu 200% zoom, NVDA/VoiceOver, Hindi copy, physical touch and representative large-repository/PDF checks. The automated 83-file/16-page sample and 6,001-record table prove interaction behavior and bounded rendering, not a 60fps phone or 20 MB real-PDF performance result.
