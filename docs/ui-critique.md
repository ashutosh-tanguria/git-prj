# UI repair critique

2026-11-16, Asia/Calcutta. Written from the unchanged M1 capture before styling edits. The task is presentation only: tokens, CSS and styling markup. Providers, routing, hooks, selection, keyboard handlers, persistence, guards, dependencies and feature scope stay unchanged.

## Capture method and availability

The before matrix is in [ui-before](ui-before/), with one manifest per light/dark and 1440/1024/360px combination. The same named sample library, clock, viewports, route transitions and states are used after repair in [ui-after](ui-after/). The review includes Connect default/focus/error/busy; list default/hover/focus; single/multiple selection; column chooser; Inspector Details/Preview/empty; expanded Locations; Quick Look; PDF default/controls/thumbnails/outline/search/error; Markdown; code unwrapped/wrapped; image, CSV, HTML source/preview, native audio and unsupported viewers; empty folder; listing error; offline status; and three Styleguide densities. Samples are fixture-only, and no account verification is claimed.

Explorer Grid view is not implemented. The existing list has the ARIA grid role. A Grid view screenshot would fabricate a new feature, so its absence is recorded in the manifests rather than building it during this pass. Native video uses the existing Media reader; the supplied local media fixture is audio, so video decoding is not claimed.

The original workspace directory was absent. The matching clean M1 checkout at commit 1d81b19 was found in the Recycle Bin and recovered as a fresh local checkout at D:/Downloads/github-project. The saved GitHub origin was preserved. Cached dependencies were copied locally; package manifests and lockfile are unchanged.

## Defects and exact repairs

1. **High | Shell, all screens | Chrome overwhelms the file area.** Main content begins at y=230.69 and the desktop list at y=365.69 in both palettes. Fix `src/components/Library.module.css`: make `.shell` a grid with a single `--shell-toolbar-height:64px` desktop toolbar row. Place the existing brand, address form and pane controls in that row. At 360px use explicit 44/48/44px rows. Add styling classes in `Library.tsx`, `AddressBar.tsx` and `ReadShell.tsx`; retain every handler, input, label and shortcut.

2. **High | Explorer, Inspector, dark theme | List and chrome use one surface.** The reading area disappears into the side panes in the squint view. Fix `.content` and the Styleguide `.main` to `--paper-2`, side panes to `--paper-1`, toolbar/status bands to `--paper-0`, and list header to `--paper-1`. Keep the audited palette unchanged. Use 1px `--rule` pane boundaries and `--rule-strong` only for essential control boundaries and the header baseline.

3. **High | All screens | Three equally padded footer bands consume 132 desktop pixels.** Fix `.pendingStrip`, `.guardStrip` and `.statusStrip` in `Library.module.css`: 32px Pending, 32px minimum guard, 24px status, with 12px inline padding, 12px Pending/status meta text and 14px guard copy. Let the guard sentence wrap naturally on mobile. Give each band a distinct role; preserve the non-dismissible copy and always-visible Pending line.

4. **High | Connect | The token form is an unstructured full-width native form.** Fix a new `.connect` styling class on the existing section: maximum 560px, 24px top rhythm, 12px pane inset, 16px reading copy, 40px input minimum, 12px gap before the action. Use the existing primary Button variant for Validate token. Keep the form left aligned with no hero, card or invented onboarding content.

5. **High | Markdown and code | Reading content inherits tiny shell text and browser-default heading/list/table spacing.** Add a class to the existing sanitized Markdown host and style `Viewer.module.css`: body 16px/1.5, maximum 72ch, 20px document title, 16px section headings, 16px paragraph rhythm, neutral 1px table rules and 12px cell padding. Keep UI type for code as required by section 5.4. No parser or sanitizer changes.

6. **High | Quick Look and PDF | Flexible reader children have no reliable bounded dialog height.** Fix `.modal [role=dialog]` and its existing content wrapper to a full-height flex column with `min-block-size:0`. Group the existing title and Close control in a styling header. Keep `.viewer`, `.reader` and `.layout` shrinkable, and show the paper against `--paper-0`. Set the Modal overlay to the existing dialog layer with a neutral dimming token (24% light, 40% dark) so background previews stop competing; this is a flat scrim without blur. Preserve modal focus trapping, page rendering, zoom and search logic.

7. **Medium | Pane headers | Brand, repository, Locations and Inspector all compete as large headings.** Fix `.brand`, `.locationHeading`, Locations heading and Inspector heading: brand 20px, pane/repository headings 16px/24px at weight 600, shared 44px header rhythm, 12px inset. Keep 28px for Connect/empty states and 20px for real dialogs. Do not alter heading text or semantic levels.

8. **Medium | All controls | Secondary navigation looks like a row of primary boxed actions.** Fix toolbar-only styles and existing quiet variants: 32px desktop control boxes, 16px outline glyphs, one 3px radius, transparent quiet backgrounds, strong ink labels, paper hover and accent focus. At 1024px show compact history glyphs while preserving accessible labels. At 360px keep 44px pane targets and visible words. No action is removed.

9. **Medium | Explorer rows | Tree items are 44px at every density while file rows are 28/32/44px. Native checkbox margins break alignment.** Fix `Locations.module.css .item` to `--row-height`. In `Table.module.css` use 13px table type, 20px line boxes, zero checkbox margin and 16px checkbox geometry centered in the existing cell. Preserve virtual row heights and the 64px mobile row estimate.

10. **Medium | Name column | Glyph plus a non-flexing filename button can clip the preserved extension.** Fix the name button to `flex:1;min-inline-size:0`, keep `.fileExtension` non-shrinking, and add ellipsis to the metadata text wrappers. Preserve stored column widths, sorting, divider behavior and horizontal scrolling. Resize geometry is not replaced by a fixed CSS column template.

11. **Medium | File glyphs | Compact glyphs hide their extension tags, making PDF, code and archives look identical.** Fix `.file[data-compact]`: a 56px registered lane with a 16px neutral outline and a readable 12px tag from the existing span. Keep folder/name alignment and the existing fallback. On mobile the base name stays on one ellipsized line so the size remains the second line. This is a styling repair to already-rendered content, not a new file-type feature.

12. **Medium | Size column | The miniature ruler inherits the large meter's border and tall ticks; numbers and rules feel detached.** Fix table-only meter geometry: 40px by 3px axis, 4px threshold ticks at the existing 50/95 positions, flat track, bottom alignment and tabular size figures. Wrap the existing size text for alignment. Do not change byte values, thresholds, verdicts or provider behavior.

13. **Medium | Selection, hover and focus | Default blue filenames compete with selection, while row hover has no deliberate state.** Fix `.row button` to `--ink-1`; hover to `--paper-0`; selection to the unchanged `--accent-tint`; focus to the existing 2px accent ring inset. Keep checkboxes, selected semantics and keyboard focus intact. No tinted edge stripe or opacity-reduced status text.

14. **Medium | Inspector | Tabs, fields, copy actions and native sliders read as unrelated defaults.** Fix `Panels.module.css` with aligned 32px tabs, a 2px selected underline, 12px labels, 14px details, 12px field rhythm, wrap-safe refs and quiet copy actions. Group each existing pane range input in a labelled utility wrapper, keeping its min/max/value/change handler and focus order. Slider labels use existing locale keys.

15. **Medium | Empty and error states | Empty copy sits below a 400px blank virtual body; errors are visually indistinguishable from ordinary paragraphs.** Collapse only the empty virtual-body presentation only when the existing grid exposes `aria-rowcount="1"`, retain the header, and place the existing empty sentence at a 32px inset with 28px type. Style existing main alerts with tested danger text/tint, 12px padding and a neutral rule. Do not add retry behavior, staging actions or change error decisions.

16. **Medium | Viewer chrome | Filename, provider, download/copy actions and help occupy arbitrary wrapped lines.** Fix `.viewer>header` to a 40px minimum, aligned action cluster with a rule below it. Use 16px filename type, 14px actions and a 32px named help disclosure. At 360px allow orderly wrapping and retain every visible action. Long names truncate visually with an intact accessible name.

17. **Medium | PDF controls | Number fields are taller than their neighboring buttons, and the sidebar/paper have no clear boundary.** Fix `Pdf.module.css`: inputs use `max(--target-min,--control-height)`, control labels use 12px meta type, the disclosure has a 32px desktop/44px coarse target, sidebar has a 1px rule and 12px spacing, pages get a quiet work surface. Preserve the disclosure's existing open/close behavior and collapse breakpoints.

18. **Medium | Code viewer | Line numbers and wrapped text do not form a stable reading rhythm.** Fix `.codeRow` to 14px UI type on a 24px line, a 40px gutter with a neutral separator, 12px content gap and paper background. Keep row creation, highlighting, wrapping, copy text and content unchanged.

19. **Medium | Radii and floating layers | Dialogs are square and ordinary pane buttons differ from primitive controls.** Assign the existing roles consistently: panes/rows/reading paper 0, inputs/buttons 3px, modal/sheet/drawer/tooltip 6px, status dots only full radius. Use the single elevation token only on floating layers, with the existing dark-theme border. No new shadow token.

20. **Medium | Styleguide | The workbench shares the flat pane background and inconsistent composite padding, obscuring the repaired hierarchy.** Fix `Styleguide.module.css`: reading canvas `--paper-2`, sidebar `--paper-1`, 24px section rhythm, 12px/24px insets and 12px state captions. Existing states, samples, interactive examples, density selectors and routes remain unchanged.

21. **Low | Address and refs | Provider paths use proportional UI type.** Use `--font-ref` for the address input and keep UI text in Atkinson Next. Do not apply monospace to code, buttons or ordinary labels.

22. **Low | HTML, image, CSV and native media readers | Content starts flush against generic controls.** Apply the same viewer toolbar/rule, 12px control spacing and bounded content widths. Add only styling classes/wrappers. Native player behavior and sandbox policy remain unchanged.

## Distinctive refinements within section 5

The before screen still reads as a generic file dashboard despite using the right font. Three functional visual details will carry the repaired identity:

1. The **weight rule** becomes a precise 40px measurement with legible 50/95 ticks and the same baseline in every Size cell. It represents actual existing size data, never fabricated quota or progress.
2. The **folded file tag lane** exposes the already-present extension labels in a fixed, quiet 56px lane so the row anatomy is recognisable without brand color.
3. The **Pending ledger rail** aligns its existing title and empty state on one baseline, with a small open working-copy marker and a single rule. The guard repeats the limit-line geometry without inventing a repo meter. These are flat strips, not dashboard cards.

## Section 5.2 checklist

- No gradients, gradient text, glass, backdrop blur, glow, neon or blobs.
- Atkinson Next remains the primary UI face; self-hosted Mono remains for refs/paths/hashes.
- No nested cards, repeated shadows or universal radius.
- No thick colored edge stripe on cards or rows; selection remains a full-row tint plus focus ring.
- No emoji, explorer illustrations, copied provider logos or marketing hero/greeting/cards.
- No uppercase transformations, tracked captions, middle-dot metadata or synthetic label fragments.
- No em dash, text arrow decoration, ambient motion or automatic entrance effects.
- The green-grey paper/ink palette and calm accent remain; no cream/terracotta or acid-green identity.
- Code uses UI type rather than monospace as decoration.

The first after review caught two presentation regressions before completion: an empty virtual DOM is not a reliable signal for an empty data set, so empty styling now keys off the existing row-count attribute; and sticky viewer headers needed the modal layer token to stay behind Quick Look. The initial 40px tag lane clipped some tags, so it is 56px to hold the existing four-character labels.

## After comparison and remaining issues

All high and medium defects 1 through 20 are addressed by the repairs listed above; both low-cost items 21 and 22 are also addressed. The matched [comparison index](ui-comparison.md) links all 216 before and after pairs. At 1440px the list grows from 490.64px to 760px high; at 360px it grows from 279.75px to 442px. The capture manifests report no document-width overflow. Selection, pane boundaries, dialog layering and paper surfaces remain distinguishable in the reviewed light and dark captures.

Remaining limits: saved column widths can require horizontal scrolling inside the table, native inputs and media controls retain platform styling, and the alternate Grid view does not exist yet. Real-account, physical-device, screen-reader and independent owner reviews remain pending.
