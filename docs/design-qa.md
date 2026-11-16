# Foundation design QA

Reviewed 2026-11-16 (Asia/Calcutta). M0 only. Reviewer: Codex, by inspection of actual Chromium captures. This is not an independent human, screen-reader or device sign-off.

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

## M1 read-path review (2026-11-16)

Actual MSW-backed Explorer and Viewer captures: [Explorer light](screenshots/explorer-light.png), [Explorer dark](screenshots/explorer-dark.png), [Markdown light](screenshots/viewer-light.png), [Markdown dark](screenshots/viewer-dark.png), [PDF light](screenshots/viewer-pdf-light.png), [PDF dark](screenshots/viewer-pdf-dark.png). These contain labelled sample document content, not a live private account.

Reviewed pane rules, full-row selection, font readability and static guard-strip placement. The read path has no remote mutation controls. PDF pages remain their document's original paper color in dark mode; surrounding chrome uses dark tokens. Styleguide now includes the read composites and a text-viewer specimen; snapshots intentionally grow to include those sections. The tooltip test now selects its own trigger unambiguously, and the PDF test targets its labelled page canvas rather than PDF.js's private measurement canvas.

This remains a partial M1 visual implementation. Inspector and mobile drawer/bottom-sheet behavior, column headers/resizing/chooser, complete shortcut and focus behavior, and the full signature ruler treatment are not ready for sign-off. The narrow Styleguide reflow test is not evidence that the full Explorer satisfies acceptance 18. No claim of full Explorer WCAG certification, phone performance, or manual screen-reader review is made.
