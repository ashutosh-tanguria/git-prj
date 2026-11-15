# Shelf

> Working name. One library for the documents you keep in GitHub, Google Drive, Dropbox and OneDrive.
> Browse them like a file explorer, read them online without downloading, stage your changes, and push only when you decide to.

This README is the single source of truth for the project. It is written for two readers: the humans building Shelf, and an AI coding agent (Codex) that must be able to build the full product from this document alone. Sections are numbered so that tasks and commits can reference them (for example "implements 6.3").

---

## 0. How to use this document (read first, agent)

1. Build the FULL product described here. This is not an MVP. Work milestone by milestone (section 14), but every milestone ends with working, tested software.
2. If two sections seem to conflict, the order of precedence is: section 8 (guards) > section 9 (security) > section 5 and 6 (UI) > everything else.
3. If something is ambiguous, pick the simplest safe option, record the decision in `PROGRESS.md` under "Decisions", and continue. Do not stop to ask.
4. Never add features that are not in this document. Never silently skip a feature: if something cannot be finished, list it in `PROGRESS.md` under "Not done" with the reason.
5. Never contact a network host that is not on the allowlist in section 9.3.
6. The UI rules in section 5 are requirements, not suggestions. A screen that breaks them is a bug.
7. Items marked **[HUMAN]** need the project owner (for example creating OAuth apps). List all of them at the top of `SETUP.md` and keep going with mocks in the meantime.

---

## 1. What Shelf is

Shelf is a client-side web app (installable as a PWA) that gives you one explorer over several storage providers. Its core idea is a **working copy**: every change you make (upload, rename, move, delete) is staged locally and shown in a Pending tray. Nothing touches the remote storage until you press Push. On GitHub, one Push becomes one atomic commit.

Shelf has no backend. Your tokens and files never pass through a Shelf server. The only server-side code is a tiny stateless Cloudflare Worker that exchanges GitHub OAuth codes (section 9.2), and it never sees files.

### 1.1 The problem

- People already use GitHub repos to keep PDFs, notes and study material, because it is free, versioned and familiar. They do it by hand: upload through the web page, no overview across repos, no offline copy, and every upload is a separate commit.
- GitHub rejects files of 100 MB or more, warns above 50 MB, and gets painful when a repository grows past about 1 GB. Nothing warns you before you hit these walls.
- Documents end up scattered across GitHub, Drive, Dropbox and OneDrive with no single place to browse, search or move between them.
- It is easy to push something private into a public repository by accident.

### 1.2 What Shelf adds

| Capability | Why it matters |
| --- | --- |
| One explorer over GitHub, Drive, Dropbox, OneDrive | Stop remembering where a file lives |
| Working copy and Pending tray | Review before anything changes remotely; one Push, one commit |
| Always-on size and visibility guards | Never hit the 100 MB wall or leak into a public repo by accident |
| Online viewing with offline cache | Read a 300-page PDF without downloading it by hand |
| Cross-provider move with hash verification | Move a heavy file from GitHub to Drive safely |
| Full-text search across cached PDFs | Find the page, not just the file |
| No server, no account, no tracking | Your files stay between your browser and your provider |

### 1.3 Form factor (final verdict)

Shelf is a **website that installs as a PWA**. It is not a CLI and not a desktop app. The full reasoning, the evidence and the costs are in section 17.1; the short version:

| Option | Verdict | Reason |
| --- | --- | --- |
| Website and PWA | Build this | Zero install, works on phones and locked lab PCs, the value is visual (working copy, limit line, document viewer), provider APIs work from the browser |
| CLI or TUI | Do not build | Crowded and one-way (`git-grab`, `gitgrab`, `gitsnip`, `ghgrab`); `git`, `gh` and `rclone` already serve terminal users; a terminal cannot show a PDF or the limit line |
| Desktop app (Tauri or Electron) | Do not build now | Signing, updates and packaging cost a lot for little gain; only local-folder sync would justify it, and that is out of scope |

---

## 2. Existing landscape (researched, do not rebuild these)

| Product | What it does | Gap Shelf fills |
| --- | --- | --- |
| GitHub web UI | Browses one repo, previews single files including PDFs | One repo at a time, no offline, no cross-provider view, each upload is its own commit |
| Filestash | Self-hosted web file manager with a Go backend and many backends (S3, SFTP, WebDAV, Git, Dropbox, Drive), themes that imitate Dropbox or GitHub | Needs a server you host; Git support is not GitHub-API-native; no staging, no size or visibility guards |
| Git CMSs (Decap, TinaCMS, Pages CMS, Sveltia) | Edit website content stored in a repo, commit through the GitHub API | Built for site content and Markdown, not a personal document library; weak media management |
| Octofiles style extensions | Upload files via GitHub issue attachments for quick sharing | Public by link, capped at 25 MB, no library, no management |
| Desktop explorers (Carelo, Sigma, Spanfinder, OneCommander) | Dual pane, Miller columns, Quick Look, tabs | Local-first desktop apps; no GitHub semantics; not zero-install |
| Zotero, Paperpile, Obsidian Git (as far as known) | PDF management with own storage, Drive, or a Git plugin | Not provider-neutral, not guardrailed around GitHub limits |

Honest positioning: Shelf is not a Dropbox replacement and not a Git client. It is a **guardrailed, GitHub-aware document library with a working copy**. When someone needs a self-hosted multi-protocol file server, Filestash is the better tool.

Borrow proven interaction patterns from the desktop explorers (Quick Look on Space, editable address bar, type-ahead, Miller columns as an optional view, dual pane for moves), but build an original visual identity (section 5).

---

## 3. Users and jobs

| Persona | Typical situation | Primary job |
| --- | --- | --- |
| The student developer | Keeps lecture PDFs, assignments and notes in several GitHub repos plus a college Drive | Read and organise everything in one place; never hit size limits |
| The self-taught builder | Keeps books, specs and screenshots next to code | Quickly open a document from any repo on a phone or laptop |
| The careful sharer | Wants to share a few public docs without exposing private ones | Be sure what is public and what is private before pushing |

Constraints from the real world to design for: mid-range Android phones, patchy mobile bandwidth, shared lab computers (so "wipe local data" must be easy), and users who are not Git experts (so say "Push" and "Pending", not "ref update").

---

## 4. Product principles

1. **Nothing remote happens until Push.** Every destructive or mutating action is staged and reversible until pushed.
2. **Guard before you regret.** Limits and visibility are shown before the user acts, not after a failure.
3. **The file is the hero.** Chrome is quiet, dense and utilitarian. The viewer gets the space.
4. **Keyboard first, pointer friendly, touch capable.**
5. **Plain language.** "Pending changes", "Push", "Private". No Git jargon unless the user opens Details.
6. **Local and honest.** No server, no analytics, no dark patterns. Say what is stored where.
7. **Fast on cheap devices.** Performance budgets in section 11 are requirements.
8. **Accessible by default.** WCAG 2.2 AA, full keyboard support, screen reader announcements for staged and pushed changes.

### 4.1 Non-goals (do not build)

- No accounts, no Shelf-hosted database, no sync service, no collaboration or sharing links.
- No document editing of any kind (no PDF annotation, no Office editing, no Markdown or text editing). Shelf views, organises and moves files.
- No Git client features (branches UI, merge, rebase). Shelf commits to one chosen branch and shows file history.
- No AI features, chat, or summarisation.
- No telemetry, and no third-party scripts, with one documented exception: Google's identity and Picker scripts, loaded only after the user connects Drive (section 9.3).
- No LFS writes by default (advanced toggle only, section 8.6).
- No S3 or generic WebDAV provider in this release. The provider interface must make adding them easy (section 10.1).

### 4.2 Glossary

- **Provider**: a storage backend (GitHub, Google Drive, Dropbox, OneDrive, Local folder).
- **Location**: a root inside a provider (a GitHub repo and branch, a Drive app folder, a Dropbox app folder, and so on).
- **Ref**: a provider-qualified path to an item, written `gh:owner/repo@branch/path/file.pdf`, `gd:<fileId>`, `db:/path`, `od:<itemId>`.
- **Working copy**: the local set of staged changes not yet pushed.
- **Pending change**: one staged add, modify, delete, rename or move.
- **Push**: apply all pending changes for one provider. On GitHub this is one atomic commit.
- **Guard**: a rule that evaluates files, repos or visibility and returns ok, info, warn or block (section 8).
- **Quick Look**: the fast preview overlay opened with Space.

---

## 5. Design system and UI language

### 5.1 Design intent

Shelf should feel like a well-run reading room: quiet, dense, precise, and obviously built for people who work with documents all day. It borrows the structure people already know from file explorers (tree, table, preview, address bar, status bar) and the clarity of GitHub's file view (last change message, repo context, history), but it has its own visual identity and does not copy any existing product's look.

Where the boldness goes (one place only): the **limit line**. GitHub's 100 MB wall is made visible everywhere it matters: a thin weight rule under file sizes, a persistent guard strip, and the Size ledger. Everything else stays disciplined and calm. The second characteristic element is the **Pending tray**, a permanent strip that makes the working copy feel like a real object.

### 5.2 Anti-template rules (hard requirements)

The interface must not look generated or templated. The following are banned. If code review finds any of them, it is a defect.

- Purple, violet or blue-to-purple gradients; any gradient used as decoration; gradient text.
- Glassmorphism, frosted blur panels, glow or neon effects, floating blobs.
- Inter, Roboto, Arial, Open Sans or the system UI stack as the primary face.
- Cards inside cards; one identical border radius on everything; the same soft grey shadow under every surface.
- A thick coloured border on one side of a rounded card or row.
- Emoji used as icons or in UI copy. Illustrations of any kind in the explorer.
- Marketing-style hero layouts, centred hero plus three feature cards, "Welcome back!" greetings.
- Tracked-out ALL-CAPS eyebrow labels above headings; meta strings joined with middle dots; labels built as "WORD - fragment".
- Em dashes in UI copy or in this project's documentation. Arrows appended to button or link text.
- Pulsing badges, bounce-on-hover, fade-and-slide entrance on every element, scroll-triggered reveals.
- A warm cream background with a terracotta accent, or near-black with a single acid-green accent, as the whole identity.
- Monospace used as a lazy "technical" look. Monospace is allowed only for paths, refs and hashes (section 5.4).

Review checklist before each milestone merge: open the Explorer screen, squint test (is hierarchy clear without colour?), grayscale test (does it still read?), and ask "which product is this?" If the answer is "any of them", change something specific.

### 5.3 Color tokens

Neutral, slightly green-grey paper tones with ink text, one calm accent, and status colours that map directly to guard tiers. Dark theme follows the system setting; light is the primary design target. All text pairs must pass WCAG AA (4.5:1 body, 3:1 large text and UI parts); add an automated contrast test that fails the build if any pair drops below the threshold, and adjust hex values to pass.

```css
:root {
  /* surfaces */
  --paper-0: #E9ECE7;   /* app background behind panes */
  --paper-1: #F5F6F3;   /* panes: tree, table, inspector */
  --paper-2: #FFFFFF;   /* menus, dialogs, inputs */
  /* ink */
  --ink-1: #1A1F1B;     /* primary text */
  --ink-2: #444C46;     /* secondary text */
  --ink-3: #5F685F;     /* tertiary text, placeholders */
  /* rules */
  --rule: #D2D7CF;      /* 1px separators */
  --rule-strong: #B3BAB0;
  /* accent */
  --accent: #1F5C8E;    /* focus ring, links, primary action */
  --accent-ink: #FFFFFF;
  --accent-tint: #DCE8F2; /* selected row background */
  /* status, tied to guard tiers */
  --ok: #2B7A4B;
  --warn: #9A6200;
  --danger: #B3261E;
  --ok-tint: #E1F0E6; --warn-tint: #F6EAD0; --danger-tint: #F7DEDB;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper-0: #121513; --paper-1: #181C19; --paper-2: #212622;
    --ink-1: #E4E8E2; --ink-2: #B9C0B7; --ink-3: #939C91;
    --rule: #2C332D; --rule-strong: #414A42;
    --accent: #7DB2E3; --accent-ink: #0E1A26; --accent-tint: #1F3447;
    --ok: #6FCB93; --warn: #E0A84A; --danger: #F2877F;
    --ok-tint: #1C2B21; --warn-tint: #2E2616; --danger-tint: #33201E;
  }
}
/* user override: [data-theme="light"] and [data-theme="dark"] on <html> */
```

Rules: colour never carries meaning alone (pair with shape, icon or text). Selected rows use the full-row `--accent-tint` plus the 2px focus ring when focused; no left-border accents.

### 5.4 Typography

- Family: **Atkinson Hyperlegible Next** (variable, OFL) for all UI and reading chrome, and **Atkinson Hyperlegible Mono** for paths, refs and hashes only. Self-host via the `@fontsource-variable` packages so the PWA works offline and the CSP stays strict. It is a deliberate choice: designed for letterform distinction (I, l, 1, O, 0), which matters for filenames and hashes, and it is not the default face of generated interfaces.
- Scale: 12 meta, 13 dense table text, 14 base UI, 16 viewer chrome and long text, 20 dialog titles, 28 empty states and onboarding. Line height 1.35 for UI, 1.5 for reading text. Weights 400, 500, 600 only.
- Sentence case everywhere. No uppercase transforms, no letter-spacing tricks.
- Numbers in tables use `font-variant-numeric: tabular-nums` so sizes align. Sizes are right-aligned with the unit in a consistent column ("14.2 MB").
- Line length for any reading text (Help, onboarding) stays under 72 characters.

### 5.5 Shape, spacing, elevation, density

- Spacing grid: 4px base. Pane padding 12px. Dialog padding 20px.
- Radius: 3px for buttons and inputs, 6px for menus and dialogs, 0 for table rows and panes, full radius only for status dots. Do not use one radius for everything.
- Panes are separated by 1px `--rule` lines, not by cards, gaps or shadows.
- Elevation: only floating layers (menus, dialogs, command palette) get one shadow: `0 8px 24px rgba(20,28,22,0.18)` in light, a 1px `--rule-strong` border in dark. Nothing else has a shadow.
- Row density: compact 28px, default 32px, comfortable 44px (default when `(pointer: coarse)`). User-selectable in Settings.
- Minimum target size 24 by 24 CSS px (44 on touch).

### 5.6 Iconography and file glyphs

- Action icons: one consistent outline set at 16px with a 1.5px stroke (Lucide icons are acceptable for actions only). No emoji.
- File glyphs are custom and drawn in code, not stock icons: a document silhouette with a folded corner and a short extension tag set in the UI font (PDF, MD, PNG, MP4, ZIP and so on). Folders are a plain tab-and-body silhouette. Glyph colour is neutral `--ink-3`; only the extension tag may use a muted hue per type family (documents, images, media, code, archives). Provide a generic fallback glyph.
- Thumbnails: PDFs show a rendered first page (generated lazily in a worker and cached); images show a downscaled thumbnail; others show the glyph.

### 5.7 Provider marks

Each provider has a small geometric mark and a text label. Never use brand logos. Shape plus hue so they differ without colour:

| Provider | Mark | Hue |
| --- | --- | --- |
| GitHub | filled square | charcoal `#2B2F2C` |
| Google Drive | filled triangle | green `#3B7A4F` |
| Dropbox | filled diamond | blue `#2F68A8` |
| OneDrive | filled circle | amber `#B26A00` |
| Local folder | hexagon outline | slate `#5B6670` |

### 5.8 Motion

- No ambient or entrance animation. Motion only answers a user action and shows what changed.
- Allowed: Pending tray count change (150ms), row removal when staged for delete (strike-through, then collapse in 120ms), progress bars during Push, Quick Look open (120ms scale from the row), dialog open (100ms fade).
- Everything respects `prefers-reduced-motion: reduce` (replace with instant state changes).

### 5.9 Shell layout

```
+--------------------------------------------------------------------------------------+
| Shelf  [<][>][^]  gh:ada/notes@main / semester-5 /        [Search or run  Ctrl+K] [3]|  title bar: history, address bar, command entry, pending badge
+-----------------+--------------------------------------------+-----------------------+
| LOCATIONS       | Name              Size       Changed  Last   | INSPECTOR             |
| GitHub          | [] algorithms.pdf 14.2 MB__  2d  Add wk 3    |  [Preview][Details]   |
|  > ada/notes    | [] os-notes.pdf   63.0 MB____ 5d  Scan v2    |  [History]            |
|  > ada/cs       |    (rows virtualised)                        |                       |
| Google Drive    |                                              |  (file preview or     |
|  > Shelf        |                                              |   file details)       |
| Dropbox         |                                              |                       |
| Collections     |                                              |                       |
|  Exam prep      |                                              |                       |
+-----------------+--------------------------------------------+-----------------------+
| Pending 3   2 added, 1 renamed   +38 MB   [Review] [Push to GitHub]                  |  Pending tray (always visible, collapses to a single line)
+--------------------------------------------------------------------------------------+
| GitHub: each file must stay under 100 MB, each repo under 1 GB.  ada/notes 612 MB of 1 GB |  Guard strip (not dismissible)
+--------------------------------------------------------------------------------------+
| Online   API calls left 4,812   Cache 212 MB of 500 MB   ada@github                   |  Status bar
+--------------------------------------------------------------------------------------+
```

Behaviour:
- Left Locations pane 220px default, resizable 160 to 360, collapsible (`Ctrl+B`). Inspector pane 320px default, resizable 240 to 520, collapsible (`Ctrl+Alt+B`). Pane sizes persist.
- Title bar holds history buttons, an editable address bar (breadcrumbs by default; `Ctrl+L` turns them into a text field with path completion), the command entry (`Ctrl+K`), and the Pending badge.
- The **weight rule**: in GitHub locations the Size cell shows a 40px wide, 3px tall rule under the number, filled in proportion to size over 100 MiB, coloured `--ok` below 50 MiB, `--warn` from 50 to 100, `--danger` at 100 and above. Hidden for other providers.
- Below 900px width the Inspector becomes a bottom sheet; below 640px the Locations pane becomes a drawer and the table becomes a single-line list (section 7.3).

### 5.10 Voice and microcopy

- Plain, specific, sentence case, active voice. The button that says "Push to GitHub" produces a toast that says "Pushed to GitHub". Actions keep the same name through the whole flow.
- Errors say what happened and what to do, never apologise and never blame. Empty states say what to do next.
- Examples (use these as the pattern):
  - Empty folder: "No files here. Drop files to stage them, or press U to choose files."
  - Offline: "You are offline. Cached files still open. Pending changes will push when you reconnect."
  - Token expired: "Your Google Drive session ended. Reconnect to keep working with this folder."
  - Delete staged: "os-notes.pdf will be deleted from GitHub when you push. Undo."
  - Pushed: "Pushed 3 changes to ada/notes in one commit."
- Do not write: "Oops", "Something went wrong", "Awesome", "Let's get started", "Supercharge", or any marketing tone.

### 5.11 How to build the UI so it is engineered, not generated

The look comes from decisions written down before code, enforced by tools, and checked by people. Follow this order.

1. **Tokens first.** `tokens.css` holds every colour, size, radius, spacing step and the one shadow. Components may only use `var(--...)`. Stylelint fails the build on raw hex or rgb values, gradients, `backdrop-filter`, and shadows outside the elevation token.
2. **Primitives next.** Button (primary, secondary, quiet, danger), IconButton, Input, Select, Checkbox, Kbd, Badge, Meter, Tooltip, ProviderMark, FileGlyph. Each is specified with a state table: default, hover, focus-visible, active, disabled, loading, error, selected. Build all states, not just default.
3. **Styleguide route** (`#/styleguide`, dev and test builds only): every primitive and composite in every state, in light and dark, at the three densities, with realistic sample content. Playwright snapshots protect it. This page is how the interface is reviewed without clicking through the app.
4. **Composite components**: FileTable, Tree, Breadcrumbs and AddressBar, PendingTray, GuardStrip, RepoMeter, SizeLedger, Inspector, Dialogs, CommandPalette, ContextMenu. Behaviour first (keyboard, ARIA), then style.
5. **Screens last**, composed only from components that already exist in the styleguide.

Design rules that keep it human-made:
- One decision per axis: one type family pair, one accent, one elevation, three radii with defined roles. If a new value is needed, change the token and justify it in `docs/design-qa.md`.
- Hierarchy through size, weight, spacing and position, not boxes. Prefer rules (1px lines) and whitespace to cards.
- Density is a feature. Explorer rows are compact and aligned on a baseline grid; numbers use tabular figures; columns line up.
- The signature element (limit line and weight rule, Pending tray) is allowed to be distinctive. Everything else stays quiet.
- Copy follows 5.10 and lives in locale files. No placeholder text, no marketing voice.

Design QA before each milestone merge (record results with screenshots in `docs/design-qa.md`):
- Squint test: with the page blurred, can you still see the table, the selection, the tray and the guard strip?
- Grayscale test: does meaning survive without colour (markers, shapes, text)?
- 200% zoom and 360px width: nothing clips, nothing overlaps.
- Dark theme: contrast tokens pass; selection and focus still obvious.
- Anti-template scan: tick every item in 5.2.
- "Which product is this?" test: show the screenshot to someone without a logo. If they say "any dashboard", revise a specific element.

---

## 6. Screens and interactions

### 6.1 Routes and navigation model

Hash routing only (works on any static host and survives reloads):

| Route | Screen |
| --- | --- |
| `#/` | Library home (recents, favorites, collections, connected locations) |
| `#/gh/owner/repo@branch/path` | Explorer in a GitHub location |
| `#/gd/<folderId>` | Explorer in Google Drive |
| `#/db/path` | Explorer in Dropbox |
| `#/od/<itemId>` | Explorer in OneDrive |
| `#/view/<ref>` | Full viewer for a file (any provider; ref is URL-encoded) |
| `#/search?q=...&mode=name|text` | Search results |
| `#/pending` | Pending changes review |
| `#/settings/<section>` | Settings |
| `#/help` | Help |

Back and forward follow browser history. Every explorer location and every open file is deep-linkable. Hash values never contain tokens or secrets.

### 6.2 First run: Connect

There is no marketing page and no hero. First run opens the real shell with an empty Locations pane and one panel in the main area, left-aligned, titled "Connect a location".

- One row per provider, each with its mark, name, one line saying what Shelf can do there, and a Connect button. GitHub's row also states the limit: "Files must stay under 100 MB." Local folder is listed as "Import and export only".
- Under the list, three plain lines (no icons, no numbering): "Nothing changes in your storage until you push." "Limits and visibility are checked before you push." "Your tokens and files stay in this browser."
- GitHub connect opens a dialog with two tabs: **Sign in with GitHub** (shown only if the OAuth worker URL is configured) and **Use a token**. The token tab is a guided form: what a fine-grained token is, the exact permissions to select (Contents: read and write; Metadata: read), which repositories to allow, a link that opens GitHub's token page in a new tab, a paste field, a Validate button that calls `GET /user`, and a clear statement of where the token will be kept (memory by default).
- After the first provider connects, the panel is replaced by that provider's root listing. The panel returns only when no provider is connected.

### 6.3 Explorer (table view, the default)

Columns, left to right: selection checkbox (visible on hover, focus, or when any row is selected), Name, Size, Changed, Last change, and Provider (shown only in mixed views such as Collections, Search and Recents).

Row anatomy:
- File glyph (16px) then name. The extension stays visible even when the name is truncated in the middle with an ellipsis.
- Pending marker after the name: a 6px square for add (`--ok`), a 6px diamond for modify or rename (`--accent`), a 6px triangle for delete (`--danger`). Deleted rows also strike through the name. The marker has an accessible label ("Pending: added").
- Size cell: number, right aligned, plus the weight rule in GitHub locations (section 5.9).
- Changed: relative time ("2 days ago"), with the exact timestamp as a tooltip and in Details.
- Last change: for GitHub, the first line of the last commit that touched the item (truncated, full text in tooltip). For other providers, "Edited by you" or the editor name when the API provides it. Never fabricate.
- Folders sort before files by default. Sorting is stable and persists per location.

Header: sticky, sortable by click, columns resizable by dragging the divider, column chooser in the header context menu. Row heights follow the density setting. Rows are virtualised (render only visible rows plus a buffer). Lists of 10,000 rows must scroll at 60fps on a mid-range phone.

Hover and focus: hover shows a subtle `--paper-0` tint; the focused row shows the 2px `--accent` focus ring inset. Selection uses `--accent-tint`.

### 6.4 Views

- **List**: described above, default.
- **Grid**: thumbnails at three sizes (120, 160, 200px), name below, size on hover or in a compact second line. PDFs show a first-page render.
- **Columns**: Miller columns. Selecting a folder opens its contents in a new column to the right; the last column is the preview. Left and right arrows drill out and in. Each column header shows its item count. Columns are resizable. Good for deep trees, off by default.
- **Split**: two independent explorers side by side, each with its own location, view and history. A header on each pane shows its provider mark and path. Dragging between panes stages a copy or move (section 6.11). Toggle with `Ctrl+\`.

View switcher lives in the title bar area of the main pane (List, Grid, Columns) and in the command palette.

### 6.5 Quick Look and viewers

Quick Look: press Space on a selected file. An overlay (about 70% of the viewport) shows the file; Left and Right arrows move through the files in the current folder without closing; Esc closes; Enter opens the full viewer; it shows a loading progress bar and a "Cached" indicator. Opening animates from the row (120ms) unless reduced motion is on.

Full viewer (`#/view/<ref>`): chrome is a single 40px toolbar (back, filename in mono-free sans, provider mark, page or zoom controls, Download, Copy link, Inspector toggle). The file gets all remaining space.

| Type | Viewer behaviour |
| --- | --- |
| PDF | pdf.js with a text layer. Continuous scroll or single page; fit width, fit page, zoom 25 to 400%; thumbnails sidebar; outline sidebar when present; in-document search with highlights and next or previous; selectable text; remembers last page and zoom per file; keyboard: `j`/`k` or PgDn/PgUp, `+`/`-`, `/` to search, `g` then number to jump. Optional "reading mode" that inverts page colours. Pages render lazily and are released when far off-screen. |
| Image | Fit, 100%, zoom and pan, keyboard arrows to move to the next image in the folder. No editing. |
| Video, audio | Native controls via a blob URL; space to play or pause; `f` fullscreen; seek with arrows. |
| Markdown | Sanitised render (marked + DOMPurify). Relative images and links resolve through the same provider. External links open in a new tab with `rel="noopener noreferrer"`. |
| Code and text | Syntax highlighting, line numbers, wrap toggle, copy button. Files over 2 MB open as plain text with a notice. |
| CSV, TSV | Virtualised table of the first 5,000 rows with a notice and an "Open all rows" action that warns above 100,000 rows. |
| HTML | Not auto-run. Shows source with a "Run preview" button; preview runs in an iframe with `sandbox` and without `allow-same-origin`, with a notice that scripts run in isolation. |
| DOCX, PPTX, XLSX, others | Metadata and a Download button only. Say so plainly: "Shelf cannot preview this file type." |

Every viewer: Download, Copy path, Open in provider (opens the provider's own web page in a new tab), keyboard shortcuts listed under `?`.

### 6.6 Inspector

Three tabs: **Preview**, **Details**, **History**.
- Preview: a compact viewer for the selected item.
- Details: name, type, size (exact bytes on hover), provider and location, the ref in the mono face with a copy button, content hash (git blob sha, Drive md5, Dropbox content hash, OneDrive hash as available), modified time, last change message, visibility badge (Public or Private for GitHub locations), cache status, and the current guard verdict with its reason.
- History: GitHub shows commits that touched the file (message, author, date, short sha) with "Restore this version", which stages a modify (it does not push). Drive, Dropbox and OneDrive show revisions with the same Restore action.
- Multi-select: Details shows the count, total size, mixed-provider note if any, and the combined guard verdict.

### 6.7 Pending tray and Push

The tray is always visible at the bottom of the shell. With no changes it collapses to a single quiet line "No pending changes". With changes it shows a count, a breakdown ("2 added, 1 renamed, 1 deleted"), the net size ("+38 MB"), and two buttons: Review and Push to <provider> (one button per provider with changes; if several, the primary is the active location's provider).

Review (`#/pending`, or a panel over the Inspector): changes grouped by provider and location. Each row shows op, path, size, guard verdict chip and a Discard button. Linked changes (a move is a copy plus a delete) display as one row. Filter chips: All, Added, Changed, Deleted, Blocked. `Ctrl+Z` undoes the last staging action; undo history lives for the session only.

Push dialog (per provider):
1. Target: repository and branch (branch selector lists existing branches; default is the location's branch), visibility badge, and a one-line account note.
2. Commit message: pre-filled ("Add 2 files and rename 1 in semester-5"), editable, required.
3. Guard summary: every verdict, blocked items listed first. Push is disabled while any item is blocked.
4. Plan: "1 commit, 38 MB." If over 500 MB, "Splits into 2 commits" with the reason.
5. Public repository confirmation checkbox when applicable: "Everything I push here will be public."
6. Push button, disabled until valid. During push: per-file progress, an overall bar, Cancel (available until the final ref update). On success a toast: "Pushed 3 changes to ada/notes in one commit." with a "View commit on GitHub" link. On failure: which step failed, what to do, and the statement that nothing changed remotely if the final ref update did not run.

### 6.8 Conflict dialog

Triggered when a staged change's base version no longer matches the remote, or when the branch moved and touched the same paths. Title: "Changed on GitHub since you staged this". Shows the file name, who changed it and when if known, and four actions: **Keep theirs** (discard my change), **Keep mine** (overwrite, requires a second confirm), **Keep both** (rename mine to "name (shelf copy).ext"), and **Open theirs** (opens the remote version in the viewer). No option is pre-selected, and Continue stays disabled until one is chosen. Shelf never overwrites silently.

### 6.9 Guard dialogs

Full rules are in section 8. UI behaviour:
- **Block** (file at or above the limit): a dialog titled "This file is too large for GitHub". Body: "algorithms-full.pdf is 148 MB. GitHub rejects files larger than 100 MB. Shelf stops at 95 MB to leave a margin." Actions as a vertical list of plain buttons: **Send to** Drive, Dropbox or OneDrive (only connected ones are listed), **Split into parts** (PDFs only, shows the planned part count and approximate size), **Use Git LFS** (only if advanced LFS is enabled in Settings), **Don't stage**. No default action.
- **Warn** (50 to 95 MB): an inline confirm, "This file is 72 MB. GitHub warns above 50 MB and large files slow every clone. Stage anyway?" with **Stage anyway** and **Send to another provider**.
- **Info** (25 to 50 MB): no dialog; a small "Large" chip on the row and in the tray.
- **Repo amber, red, block**: shown in the guard strip, the Push dialog and the Size ledger (section 6.10).
- **Public repo**: the confirmation checkbox in Push; the badge is permanently visible in the title bar for GitHub locations.
- **Sensitive filename**: a warn dialog when a staged name matches the heuristics in section 8.7.

### 6.10 Size ledger

Opened by clicking the guard strip's repo meter or from the command palette. A right-hand panel shows:
- A segmented bar of the repo's size with tick marks at 500 MB, 1 GB and 5 GB and a plain sentence ("This repository uses 612 MB. Keep it under 1 GB.").
- "Largest files": up to 20 horizontal bars on a shared axis, with a vertical **limit line** at 100 MB (labelled) and a lighter line at 50 MB. Bars past a line change colour per tier. Each row has a checkbox to select it for Move.
- A note: "Deleting a file does not shrink the repository, because Git keeps its history. The size shown can lag behind GitHub."
- Actions: Move selected to another provider, Split PDF (when applicable).
This panel is the signature screen; polish it.

### 6.11 Move and copy

Entry points: context menu "Move to...", drag between Split panes, the command palette, and the Size ledger. A move is a linked pair: copy to the target, verify, then delete the source. Both appear as one row in the Pending list. At push time: write to target, read back and compare SHA-256 against the source bytes, and only then delete the source. If verification fails the source is untouched and the row shows "Not verified, source kept". Cross-provider copy follows the same path without the delete.

### 6.12 Search and command palette

`Ctrl+K` opens one palette (a floating layer, 560px wide, results list with keyboard navigation). Prefixes switch mode: `>` commands, `/` file names, `?` full text, `@` locations, `#` tags. With no prefix it blends commands, recent files and names.

Commands (each with its shortcut shown): Push, Review pending, Discard all pending, Move to..., Copy to..., Split PDF, Switch view, Open Size ledger, Connect provider, Go to location, Toggle theme, Toggle density, Export selection as ZIP, Open settings, Wipe local data.

Full-text results show provider mark, path, page number and a snippet with the match highlighted; choosing one opens the viewer at that page. Indexing state is visible ("Indexing 12 of 40 files") and never blocks the UI.

### 6.13 Collections and tags

Collections are named virtual folders that can hold items from any provider (references, not copies). Tags are text labels with a small dot (six muted hues, each paired with a distinct shape). Both live in the Locations pane and are stored locally. Optional and opt-in: write `.shelf/collections.json` to a chosen location so they roam between devices. Drag items onto a collection to add them.

### 6.14 Settings

Sections: General (language en and hi, theme, density, default view), Providers (connect or disconnect, token storage mode, default branch per repo), Storage (cache cap, clear cache, wipe all local data), Guards (thresholds shown read-only, advanced LFS toggle, sensitive-name warnings on by default), Privacy (a plain table of what is stored where, and a statement that there is no telemetry), Keyboard (full shortcut list), About (version, licences, source link).

### 6.15 Loading, empty, error, offline states

| State | Behaviour |
| --- | --- |
| Loading list | Three static skeleton rows, no shimmer. After 400ms show a thin determinate or indeterminate progress line under the title bar. |
| Empty folder | The pattern in 5.10. |
| Offline | Status bar shows "Offline". Cached files open. Staging still works. Push is disabled with the reason and runs automatically on reconnect only if the user left "Push when back online" on for that batch. |
| Rate limited (GitHub) | "GitHub allows 5,000 requests per hour. None left. Resets at 14:32." A live countdown. Reads fall back to cache. No retry loops. |
| Token expired or revoked | Inline banner with a Reconnect button; staged changes are kept. |
| Permission error | Names the missing permission and where to fix it. |
| Truncated tree (very large repo) | Listing falls back to per-folder requests; a small notice explains why it is slower. |
| LFS pointer | Row shows "Stored in Git LFS". Preview is unavailable with a plain explanation. |
| Corrupt or unsupported file | "Shelf cannot open this PDF. It may be damaged." plus Download. |
| Storage full | Names the cap and offers Clear cache. |

### 6.16 Selection, keyboard, drag and drop, context menus

Selection: click selects one; `Ctrl`/`Cmd` click toggles; `Shift` click selects a range; drag on empty space draws a selection box; `Ctrl+A` selects all in the current view; type-ahead jumps to the first matching name.

Keyboard map (all configurable later, these are the defaults):

| Key | Action |
| --- | --- |
| `Ctrl+K` | Command palette |
| `Ctrl+L` | Edit address bar |
| `Alt+Left` / `Alt+Right` | History back and forward |
| `Backspace` or `Alt+Up` | Parent folder |
| `Enter` | Open (folder or full viewer) |
| `Space` | Quick Look |
| `U` | Upload (stage) files |
| `F2` | Rename (stages a rename) |
| `Delete` | Stage delete |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo and redo staging |
| `Ctrl+Shift+P` | Push active provider |
| `Ctrl+B` / `Ctrl+Alt+B` | Toggle Locations or Inspector |
| `Ctrl+\` | Toggle split view |
| `?` | Shortcut list |

Drag and drop: dropping OS files on a folder stages adds into it (and shows guards immediately); dropping a row on a folder stages a move within the provider; dropping across Split panes stages a cross-provider copy or move. Touch devices do not use drag and drop (it fights scrolling): long-press enters selection mode and a bottom bar offers Move, Copy, Delete, Tag.

Context menu (right click or long press): Open, Quick Look, Rename, Move to..., Copy to..., Download, Copy path, Add to collection, Tag, Details, Delete. Items that are not valid are hidden, not greyed out.

---

## 7. Accessibility, responsiveness, internationalisation

### 7.1 Accessibility (WCAG 2.2 AA, tested)

- Locations pane uses the ARIA tree pattern (roving tabindex, arrow keys, `Home`/`End`, type-ahead, `*` to expand siblings). The file list uses the grid pattern with row selection; Grid view uses a listbox-like pattern with arrow navigation.
- Visible focus everywhere: 2px `--accent` ring with 2px offset, never removed. Skip links to Locations, File list, Inspector, Pending tray.
- Live regions: a polite region announces "Staged 2 files", "Deleted staged", "Pushed 3 changes", "Indexing finished"; an assertive region announces blocks and errors. Toasts never steal focus.
- Dialogs trap focus, restore it on close, and close on Esc. The command palette is a combobox with listbox results.
- Support `forced-colors: active` (use system colours and keep marker shapes), `prefers-reduced-motion`, `prefers-contrast: more` (use `--rule-strong` and thicker rules), and text zoom to 200% without loss of function.
- Target size at least 24 by 24 CSS px, 44 on coarse pointers.
- All icons have accessible names; marker shapes and text carry meaning, never colour alone.
- CI runs axe-core on every screen and fails on serious or critical issues. Manual screen-reader pass (NVDA and VoiceOver) is a release checklist item.

### 7.2 Responsive behaviour

| Width | Layout |
| --- | --- |
| 1200px and up | Locations, list, Inspector all visible |
| 900 to 1199px | Inspector collapsed by default (toggle) |
| 640 to 899px | Locations collapsed to a rail; Inspector is a bottom sheet |
| Under 640px | Single column; Locations is a drawer; list rows show name, size and a pending marker on two lines; Pending tray is a sticky bottom bar; Quick Look is full screen; selection mode replaces drag and drop |

### 7.3 Internationalisation

- i18next with namespaces per area. Ship `en` and `hi`. All strings (including guard messages) live in locale files; no hard-coded copy in components.
- Plural and number formatting through `Intl`. Sizes always use binary units internally and display "MB" in UI copy (the 100 MB wording matches how GitHub states its limit).
- Layout must tolerate longer Hindi strings and a future RTL language (logical CSS properties).
- Dates use `Intl.RelativeTimeFormat` with absolute time in tooltips.

---

## 8. Guards (the most important logic in the product)

Guards are pure, synchronous functions in `src/lib/limits.ts` (plus `guards.ts`), fully unit-tested, and used by the UI at staging time, in the Push dialog, and again right before the network call. Never rely on the UI alone.

### 8.1 Constants

```ts
export const MiB = 1024 * 1024;
export const GiB = 1024 * MiB;

export const GITHUB = {
  FILE_INFO_AT: 25 * MiB,     // chip "Large"
  FILE_WARN_AT: 50 * MiB,     // GitHub itself warns above 50 MiB
  FILE_BLOCK_AT: 95 * MiB,    // GitHub rejects > 100 MiB; Shelf keeps a 5 MiB margin
  GITHUB_HARD_LIMIT: 100 * MiB, // used in copy only
  BATCH_CAP: 500 * MiB,       // max bytes per commit Shelf creates (GitHub enforces 2 GB per push)
  REPO_AMBER_KB: 500 * 1024,  // 500 MB, repo.size from the API is in KB
  REPO_RED_KB: 1024 * 1024,   // 1 GB
  REPO_BLOCK_KB: 5 * 1024 * 1024, // 5 GB
  LFS_FREE_QUOTA: 10 * GiB,   // storage and bandwidth each, free plans (copy only)
} as const;
```

### 8.2 File verdicts (GitHub)

| Size | Level | Behaviour |
| --- | --- | --- |
| under 25 MiB | ok | none |
| 25 to under 50 MiB | info | "Large" chip |
| 50 to under 95 MiB | warn | confirm dialog; weight rule turns `--warn` |
| 95 MiB and above | block | cannot stage for GitHub; options: other provider, split (PDF), advanced LFS |

The verdict is recomputed at push time from actual blob size. The guard message always states the 100 MB wording from GitHub even though Shelf blocks slightly earlier.

### 8.3 Repo verdicts

Input: `repo.size` (KB) from `GET /repos/{owner}/{repo}` plus the net size of staged adds for that repo.

| Projected size | Level | Behaviour |
| --- | --- | --- |
| under 500 MB | ok | meter green |
| 500 MB to under 1 GB | info | meter amber, guard strip shows the size |
| 1 GB to under 5 GB | warn | warning on every Push dialog: "This repository is over 1 GB. GitHub recommends smaller repositories." |
| 5 GB and above | block | Push disabled unless the user ticks an explicit override with an explanation |

Always show: "Deleting files does not shrink the repository, because Git keeps history. The size shown can lag." Mention in Help how to reduce history size (out of scope to automate).

### 8.4 Batch rules

- Total bytes per commit at most `BATCH_CAP`. If the plan exceeds it, split into several sequential commits ("Part 1 of 2") and say so in the Push dialog.
- Create blobs with a small concurrency (2), and serialise ref updates. Insert at least one second between mutating requests to respect GitHub's secondary rate limits.
- Large uploads show per-file progress and can be cancelled before the final ref update.

### 8.5 Visibility guard

- A PUBLIC or PRIVATE badge is permanently shown for every GitHub location (title bar and Details).
- Pushing to a public repo requires the checkbox "Everything I push here will be public." The checkbox is never pre-ticked and its state is not remembered.
- Repositories created inside Shelf default to private. Creating a public repo needs the same checkbox.
- Do not use public repositories as a file hosting or bandwidth source for others. Add a Help note: GitHub may throttle accounts with excessive bandwidth.

### 8.6 Advanced Git LFS (off by default)

- Hidden behind Settings > Guards > "Allow Git LFS for large files".
- When enabled, the block dialog offers "Use Git LFS". Before enabling, explain: free accounts get 10 GiB of LFS storage and 10 GiB of monthly bandwidth; every version counts toward storage; downloads stop when the quota is used; and the repository must have LFS configured. If Shelf cannot confirm LFS is available for the repo, it refuses.
- LFS pointer files are always recognised on read (first line `version https://git-lfs.github.com/spec/v1`) and shown as "Stored in Git LFS".

### 8.7 Sensitive filename heuristics

Warn (never block) when a staged name matches case-insensitive patterns such as: `aadhaar`, `aadhar`, `passport`, `pan card`, `marksheet`, `password`, `secret`, `.env`, `id_rsa`, `*.pem`, `*.key`, `credentials`. The warning text names the match and the repo's visibility. If the target is public, it requires an extra confirm.

### 8.8 Other providers

Use provider-reported quota. Warn when free space is under 5%. Do not invent per-file limits; rely on the provider's error and surface it plainly. Use resumable or session uploads above the thresholds in section 10.2.

### 8.9 Guard strip copy (always visible when a GitHub location is active)

Primary text (fixed, not dismissible): "GitHub rejects files larger than 100 MB. Keep files well under that, and keep each repository under 1 GB."
Secondary text (live): "ada/notes uses 612 MB of 1 GB." Clicking it opens the Size ledger.
On the Library home and in the Connect panel, the same primary sentence appears in the GitHub row.

### 8.10 Required unit tests

Boundaries at 24.9, 25, 49.9, 50, 94.9, 95, 100 MiB; repo boundaries at 499, 500, 1023, 1024, 4999, 5120 MB; batch splitting at 500 MB; visibility checkbox requirement; sensitive-name matches and non-matches; LFS pointer detection; message keys exist in both `en` and `hi`.

---

## 9. Security and privacy

### 9.1 Threat model

| Asset | Threat | Mitigation |
| --- | --- | --- |
| Provider tokens | XSS, malicious extension, shared computer, leaked logs | Memory-only by default; optional encrypted storage (9.5); strict CSP; no logging of tokens; Wipe local data |
| Private files | Rendered content running script (SVG, HTML, Markdown, PDF) | Treat all content as untrusted (9.4); sandboxed previews; sanitisation |
| Working copy (unpushed changes) | Browser eviction, crash, cleared data | Staged blobs persisted in OPFS immediately; persistence request; export and restore of the working copy (10.13) |
| Public exposure | Pushing private material to a public repo | Visibility guard and sensitive-name guard (section 8) |
| OAuth flow | CSRF, code interception, abuse of the worker | `state` parameter validated, exact redirect URIs, worker CORS locked to the app origin, rate limits |
| Supply chain | Malicious dependency or build step | Pinned versions, lockfile, audit in CI, no postinstall scripts, minimal dependencies (9.7) |

### 9.2 Authentication per provider

| Provider | Flow | Scope or permission | Notes |
| --- | --- | --- | --- |
| GitHub (token) | Fine-grained personal access token pasted by the user | Contents read and write, Metadata read, on selected repos only | Zero backend. Default and always available. Validate with `GET /user`. |
| GitHub (sign in) | GitHub App user-to-server OAuth via the worker | Contents read and write, Metadata read | A browser cannot exchange the code (no CORS on the token endpoint), so the worker does it. Refresh tokens are handled by the worker too. Enabled only when `VITE_OAUTH_WORKER_URL` is set. |
| Google Drive | Google Identity Services token client (implicit, in browser) | `drive.file` only | Access token about one hour, kept in memory, re-requested silently on expiry. Picker (optional) attaches existing files. |
| Dropbox | OAuth code flow with PKCE, no secret | App folder access type | Request offline access so a refresh token exists; store it only if the user chose "remember". |
| OneDrive | MSAL.js auth code flow with PKCE | `Files.ReadWrite.AppFolder` | Personal and work accounts. Tokens in MSAL's in-memory cache unless "remember". |

**OAuth worker (`worker/`)**, a Cloudflare Worker, about 150 lines:
- `POST /github/token` exchanges `{code, state, redirect_uri}` for tokens; `POST /github/refresh` exchanges a refresh token.
- Holds `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Worker secrets. Stateless, no database, no KV, no logging of request bodies.
- CORS allows only the configured app origin. Rejects everything else with 403. Built-in rate limiting per IP.
- It never receives files, repo names or any content, only OAuth codes and tokens in transit.
- README in `worker/` explains deployment with `wrangler`.

### 9.3 Network allowlist and headers

The app may contact only these hosts. A Playwright test records every request in a full end-to-end run and fails on anything else.

- `api.github.com`, `raw.githubusercontent.com` (public raw files only)
- `www.googleapis.com` (Drive), `accounts.google.com`, `apis.google.com` and `docs.google.com` (GIS and Picker, loaded lazily only after the user connects Drive)
- `api.dropboxapi.com`, `content.dropboxapi.com`, `www.dropbox.com` (auth redirect)
- `graph.microsoft.com`, `login.microsoftonline.com`, and the pre-authenticated download hosts that OneDrive redirects to. If CSP blocks one, add only the Microsoft-owned domain actually observed and record it in `PROGRESS.md`.
- The OAuth worker origin, and the app's own origin.

Third-party scripts: none, with one documented exception: Google's GIS and Picker scripts, injected only after the user clicks Connect on Drive (Google offers no npm-bundled alternative). Everything else is bundled and self-hosted, including fonts.

Ship a `_headers` file (Cloudflare Pages and Netlify syntax) with:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self'; connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://www.googleapis.com https://api.dropboxapi.com https://content.dropboxapi.com https://graph.microsoft.com https://login.microsoftonline.com https://accounts.google.com <WORKER_ORIGIN>; worker-src 'self' blob:; frame-src blob: https://docs.google.com https://accounts.google.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
```

The service worker precaches only the app shell and fonts. It never caches provider API responses or file bytes (those go to IndexedDB and OPFS under the app's own control).

### 9.4 Handling untrusted content

- Every file from any provider is untrusted.
- SVG is displayed only through `<img>` or as source text, never inlined into the DOM.
- Markdown is rendered with `marked` then sanitised with DOMPurify (no scripts, no iframes, no forms); links get `rel="noopener noreferrer"` and open in a new tab.
- HTML previews run in an iframe with `sandbox` (no `allow-same-origin`), loaded from a `blob:` URL, only after the user clicks Run preview.
- PDFs render with pdf.js using `isEvalSupported: false`; JavaScript inside PDFs is disabled.
- Revoke blob URLs when viewers unmount. Cap the in-memory size of rendered text and tables.
- Never use `dangerouslySetInnerHTML` except through the single sanitising helper, enforced by a lint rule.

### 9.5 Token storage

- Default: in memory only. A reload means reconnect (OAuth providers reconnect silently when possible).
- "Remember on this device": encrypt with WebCrypto AES-GCM; key derived with PBKDF2-SHA256 (at least 600,000 iterations) from a passphrase the user enters; random salt and IV stored beside the ciphertext in IndexedDB. Auto-lock after a configurable idle period (default 30 minutes). Wrong passphrase attempts are rate-limited client-side.
- Never store tokens in localStorage, sessionStorage, cookies, URLs or logs. Redact tokens in any diagnostics.

### 9.6 What is stored locally

| Data | Where | Retention |
| --- | --- | --- |
| Tokens (optional) | IndexedDB, encrypted | Until disconnect or wipe |
| File bytes cache | OPFS (fallback IndexedDB) | LRU to the user's cap; pinned files stay |
| Listings, metadata, ETags | IndexedDB | TTL and invalidation rules (10.7) |
| Staged changes and their bytes | IndexedDB (records) and OPFS (bytes) | Until pushed or discarded |
| PDF text index | IndexedDB | Until file changes or cache wipe |
| Settings, collections, tags | IndexedDB | Until wipe |

The Privacy screen shows this table. "Wipe local data" deletes all of it and signs out of every provider.

### 9.7 Supply chain

Lockfile committed; exact versions pinned for runtime dependencies; `npm audit` and a licence check in CI; Dependabot configured; `ignore-scripts=true` in `.npmrc`; no dependency that phones home; a dependency budget (under 40 runtime packages) documented in `docs/dependencies.md` with a one-line reason for each.

### 9.8 Privacy statement

No telemetry, no analytics, no crash reporting service. A "Copy diagnostics" button in Help produces a redacted text block (versions, browser, feature support, recent error codes, no file names, no tokens) the user can paste into an issue.

---

## 10. Architecture

### 10.1 Layers

```
UI (React, CSS Modules, React Aria components, TanStack Virtual)
  |
State (zustand slices: session, locations, selection, staging, ui, settings)
  |
Services: Guards | Staging | Cache | Search/Index | Transfer (move, verify) | Router
  |
Providers: github | gdrive | dropbox | onedrive | local     (all implement StorageProvider)
  |
Workers: pdfIndex | pdfSplit | hash | thumbnail     (Web Workers, message based)
  |
Storage: IndexedDB (idb) + OPFS      Network: fetch (allowlisted hosts only)
```

Rules: the UI never calls a provider directly (only services do); guards are called by services, not trusted to the UI; every provider returns the same normalised types; workers never touch the DOM.

### 10.2 Provider interface

```ts
export type ProviderId = 'github' | 'gdrive' | 'dropbox' | 'onedrive' | 'local';

export interface Capabilities {
  maxFileBytes: number | null;
  hasFolders: boolean;
  hasVersions: boolean;
  atomicBatch: boolean;          // true only for github
  hashKind: 'git-sha1' | 'md5' | 'dropbox-sha256' | 'quickxor' | 'sha1' | null;
}

export interface Entry {
  ref: string;                   // 'gh:owner/repo@branch/path', 'gd:<id>', ...
  name: string;
  kind: 'file' | 'dir';
  size: number | null;           // bytes; null for dirs
  modified: string | null;       // ISO
  hash: string | null;           // provider native hash
  version: string | null;        // etag, sha, revision id (for conflict checks)
  lastChange?: string | null;    // commit message first line when known
  lfsPointer?: boolean;
}

export type Change =
  | { op: 'add'; ref: string; bytesKey: string; size: number }
  | { op: 'modify'; ref: string; bytesKey: string; size: number; baseVersion: string }
  | { op: 'delete'; ref: string; baseVersion: string }
  | { op: 'rename'; from: string; to: string; baseVersion: string };

export interface StorageProvider {
  readonly id: ProviderId;
  readonly capabilities: Capabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listRoots(): Promise<Location[]>;
  list(ref: string, opts?: { signal?: AbortSignal }): Promise<Entry[]>;
  stat(ref: string): Promise<Entry>;
  read(ref: string, opts?: { signal?: AbortSignal; onProgress?(n: number, total: number): void }): Promise<Blob>;
  push(changes: Change[], ctx: PushContext): Promise<PushResult>;   // atomic where capabilities.atomicBatch
  history(ref: string): Promise<VersionInfo[]>;
  quota?(): Promise<{ used: number; total: number } | null>;
}
```

Implementation notes per provider:

| | GitHub | Google Drive | Dropbox | OneDrive |
| --- | --- | --- | --- | --- |
| List | Trees API recursive; fall back to per-folder when `truncated` | `files.list` with `'<id>' in parents and trashed=false`, `fields` limited, page tokens | `files/list_folder` and `/continue` | `/me/drive/special/approot/children` or item children, `@odata.nextLink` |
| Read | Contents API with raw media type; blobs API as fallback | `files.get?alt=media` | `files/download` | `/items/{id}/content` |
| Write | Git Data API atomic commit | Multipart up to 5 MB, resumable above | `files/upload` for small, upload sessions for large | Simple PUT for small, `createUploadSession` above 4 MB |
| Version token | blob sha, commit sha | `md5Checksum`, `headRevisionId` | `rev`, `content_hash` | `eTag`, `cTag` |
| History | Commits for path | Revisions | `list_revisions` | Versions |
| Hash for verify | git blob sha1 (computed locally) | md5 | content_hash (computed locally) | sha1 or quickXorHash |

Normalise provider errors into `ProviderError { code, retryable, userMessage, details }` with codes: `AUTH_EXPIRED`, `PERMISSION`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `QUOTA`, `TOO_LARGE`, `OFFLINE`, `PROVIDER_DOWN`, `UNKNOWN`.

### 10.3 GitHub atomic push (the core algorithm)

1. Read the branch head: `GET /repos/{o}/{r}/git/ref/heads/{branch}` (head commit sha `H`) and its tree sha.
2. Re-run guards on the real bytes. Compute the plan (split into commits if over `BATCH_CAP`).
3. Conflict check: for each change with `baseVersion`, compare against the current blob sha at that path in the head tree. Mismatch means a conflict (6.8); stop before writing anything.
4. For each add or modify: `POST /git/blobs` with base64 content (concurrency 2). Renames reuse the existing blob sha and upload nothing.
5. `POST /git/trees` with `base_tree` and entries (`mode 100644`, `type blob`, `sha`); deletions use `sha: null`.
6. `POST /git/commits` with the message, the new tree, parent `H`. Author and committer: the authenticated user; if the profile email is hidden, use `<id>+<login>@users.noreply.github.com`.
7. `PATCH /git/refs/heads/{branch}` with the commit sha and `force: false`. If this fails because the branch moved (422), refetch the head; if none of the changed paths were touched upstream, rebuild the tree on the new head and retry once; otherwise show the conflict dialog.
8. On success refresh the listing, clear the staged records, invalidate caches.

Edge cases to handle explicitly:
- **Empty repository**: the Git Data API rejects it. Create the first file with the Contents API, then continue normally.
- **Protected branch**: the ref update is rejected; explain it and offer to push to a new branch.
- **Case-only renames and Unicode normalisation**: treat paths case-sensitively, warn on case-insensitive collisions.
- **Path rules**: reject names GitHub cannot store (leading or trailing slash, `..`, `.git` segments, NUL); warn over 255 bytes per segment.
- **Submodules and symlinks**: show as non-files, never modify.
- **LFS**: respect `.gitattributes`; if a staged path matches an LFS pattern, tell the user and block unless the advanced LFS flow is on.
- **Cancellation**: allowed until step 7; orphaned blobs are harmless and garbage collected by GitHub.
- **Secondary rate limits**: at least one second between mutating requests; honour `Retry-After`.

### 10.4 Data model and storage layout

```ts
type Location = { id: string; provider: ProviderId; label: string; root: string; branch?: string; private?: boolean };
type StagedChange = { id: string; provider: ProviderId; locationId: string; change: Change; groupId?: string;
                      createdAt: number; status: 'staged' | 'pushing' | 'conflict' | 'failed'; verdict: Verdict };
type Verdict = { level: 'ok' | 'info' | 'warn' | 'block'; code: string; params: Record<string, string | number>; actions: string[] };
```

IndexedDB (`idb`): stores `locations`, `listings` (key: ref, value: entries, etag, fetchedAt), `meta` (ref to Entry), `staged`, `groups`, `cachefiles` (ref, bytesKey, size, lastUsed, pinned), `textindex` (ref, version, pages[]), `collections`, `tags`, `settings`, `recents`, `secrets` (encrypted). Schema versioned with migrations and tests.
OPFS: `/files/<sha256-of-ref-and-version>` for cached bytes, `/staged/<changeId>` for staged bytes. Fallback to an IndexedDB blob store where OPFS is missing.

### 10.5 Staging state machine

`staged` -> (push) `pushing` -> removed on success, or `conflict` / `failed` (kept, with reason). `Discard` removes the record and its bytes. Undo and redo operate on an in-memory command stack of staging actions for the session. Each staging action is written to IndexedDB and OPFS before the UI confirms it, so a crash never loses a staged change.

### 10.6 Conflict detection

Staged `modify`, `delete` and `rename` carry `baseVersion` (the version token seen when staged). At push (and on a background refresh of listings), compare with the remote's current version. If different, mark `conflict` and surface the dialog (6.8). Adds that collide with an existing path are conflicts too (offer Keep both).

### 10.7 Cache policy

- File cache: LRU by `lastUsed`, user cap (default 500 MB), pinned files exempt ("Keep offline" in the context menu). Evict until under cap; never evict staged bytes.
- Listings: stale-while-revalidate with a 60 second freshness window, conditional requests with ETags where the provider supports them, forced refresh on Push or on the Refresh button (`Ctrl+R` inside the app is intercepted for this).
- Version-aware: a cached file is valid only for the version it was fetched at; a newer remote version replaces it on next open.
- Browsers can still evict storage; the app must treat the cache as disposable and re-fetch silently.

### 10.8 Search and indexing

- Filename search: in-memory index over cached listings, instant.
- Full text: a worker extracts text per page with pdf.js, stores `pages[]` (page number and text), and builds a MiniSearch index per file; results carry page numbers. Indexing runs only for cached PDFs and Markdown or text files, one file at a time, yields to the UI, is cancellable, skips files over 150 MB and shows "Skipped: too large".
- Memory: cap total index size (default 100 MB); evict oldest.
- OCR is out of scope; scanned PDFs show "No text found. This PDF may be scanned."

### 10.9 PDF split (guard remedy)

A worker using `pdf-lib` splits a PDF into consecutive page ranges so each part is at most about 90 MB. Strategy: estimate bytes per page, cut, serialise, measure, and adjust in a loop; stop and report if one page alone exceeds the limit. Names: `name.part1.pdf`, `name.part2.pdf`. Warn about memory for very large PDFs (over 300 MB) and refuse with a plain message instead of crashing the tab. The parts are staged as adds; the original is untouched.

### 10.10 Move and verify

Stream or read the source to bytes (OPFS-backed), write to the target through its provider, then verify: compare the provider-returned hash with a locally computed hash of the source bytes using the provider's native algorithm (git blob sha1, md5, Dropbox content hash, quickXor or sha1). If the native hash cannot be computed locally, download the target and compare SHA-256. Only after a match is the source delete issued. A failed verification leaves the source untouched.

### 10.11 Retry and error policy

Retry only `retryable` errors (network, 5xx, rate limit with `Retry-After`) with exponential backoff and jitter, at most 3 times, and never for mutating calls whose outcome is unknown without first checking state (for example, check whether the ref moved before retrying a ref update). No infinite loops. All user-facing messages come from locale keys.

### 10.12 State, routing, code splitting

Zustand slices with selectors; no global re-renders on selection change. Router is a small hash router (no framework router needed) with typed route parsing. Code split by route and by viewer (PDF, code highlight, CSV, Markdown). Load providers lazily on connect.

### 10.13 Protecting the working copy (browser data-loss problem)

Unpushed changes live only in the browser, and browsers can discard site data, notably Safari on iOS after about seven days without use unless the app is installed to the Home Screen, and persistent-storage requests may be denied there. Required mitigations:
- Call `navigator.storage.persist()` after the first staged change and record the result; show the outcome in Settings.
- When pending changes exist, show a quiet persistent line in the tray: "Pending changes are stored only in this browser. Push them or download a backup."
- **Download working copy**: export a ZIP containing the staged bytes plus a `shelf-working-copy.json` manifest. **Restore working copy** re-imports it. Both are in the tray menu and the command palette.
- Warn when the oldest pending change is over 24 hours old.
- `beforeunload` confirmation when pending changes exist.
- On iOS, show an install hint ("Add to Home Screen") once, with plain steps, because installed apps get far more reliable storage.
- Treat the cache as disposable and the working copy as precious; never mix their eviction logic.

---

## 11. Performance and PWA budgets

| Metric | Budget |
| --- | --- |
| App shell JS (gzip) | 150 KB or less, excluding lazy chunks |
| Each lazy viewer chunk (gzip) | 250 KB or less, except pdf.js core and its worker (loaded only when a PDF opens) |
| First load on throttled 4G, mid-range Android profile | usable shell in 2.5 s or less |
| Warm start (service worker) | interactive in 1 s or less |
| List scroll, 10,000 rows | 60 fps, no layout thrash (virtualised, fixed row height) |
| Open a 20 MB PDF from cache | first page visible in 800 ms or less |
| Staging 100 files | UI stays responsive (hashing and writes off the main thread) |
| Idle memory after closing a large PDF | returns within 20% of the baseline |

PWA: installable manifest (name, icons, `display: standalone`, theme colours matching tokens), service worker via Workbox with precache of shell and fonts only, an offline fallback that opens the cached library, an update flow that shows "A new version is ready. Reload to update." without interrupting active pushes. Lighthouse PWA and Accessibility scores at least 90 in CI.

---

## 12. Testing and CI

- **Unit (Vitest)**: guards (section 8.10), path utilities, hashing, change planning, staging reducer, conflict logic, cache LRU, locale key parity, token encryption round trip, contrast test of all token pairs.
- **Provider contract tests**: one shared suite that every provider passes against a mock server (MSW): list, read, push, history, error mapping, rate limit, pagination, truncated tree, empty repo, protected branch.
- **Component tests (Testing Library)**: Explorer table keyboard behaviour, Pending tray, Push dialog states, guard dialogs.
- **End to end (Playwright, with MSW providers)**: the acceptance criteria in section 15, run in Chromium, Firefox and WebKit. Includes the network allowlist test and an axe-core pass on every screen.
- **Visual regression**: Playwright screenshots of the styleguide route (every component and state, light and dark, three densities) with tight thresholds. Intentional visual changes must update snapshots in the same commit.
- **CI (GitHub Actions)**: install with a frozen lockfile, typecheck, lint, unit, e2e, build, bundle-size check against section 11, Lighthouse CI, `npm audit`, licence check. All required to merge.
- **Manual release checklist** in `docs/release.md`: real-account pass for each provider using throwaway accounts, 100 MB and public-repo guards by hand, screen reader pass, iOS install test.

---

## 13. Stack, repository layout, configuration

### 13.1 Stack (decided)

- **Build and language**: Vite, React, TypeScript in strict mode. Use current stable versions at build time and pin exact versions in the lockfile.
- **Styling**: CSS Modules plus CSS custom properties from `src/styles/tokens.css`. **No Tailwind, no shadcn, no MUI, no other component kit.** They bring a recognisable look; this product must not have it (section 5.2).
- **Accessible behaviour**: React Aria Components (unstyled) for Tree, Menu, Dialog, Tabs, Tooltip and ComboBox, styled entirely with the project's own CSS. TanStack Virtual for the virtualised file table, implementing the ARIA grid pattern by hand. If a React Aria component cannot meet a requirement here, build it to the matching WAI-ARIA pattern and add tests.
- **Libraries**: zustand, idb, pdfjs-dist, pdf-lib, minisearch, client-zip, marked, dompurify, highlight.js (core plus a short language list), i18next, Atkinson Hyperlegible Next and Mono via Fontsource packages (verify exact package names on npm), MSAL browser library for OneDrive, the Dropbox SDK or plain fetch for Dropbox, Workbox through vite-plugin-pwa.
- **Quality tooling**: ESLint with typescript-eslint and jsx-a11y, Prettier, **Stylelint with rules that enforce the design system**: no hex or rgb colours outside `tokens.css`, no `linear-gradient` or `radial-gradient`, no `backdrop-filter`, no `box-shadow` outside the one elevation token. Vitest, Testing Library, MSW, Playwright, `@axe-core/playwright`, Lighthouse CI.
- **Hosting**: any static host that supports a `_headers` file (Cloudflare Pages or Netlify). The worker deploys separately with `wrangler`.
- **Licence**: MIT (note Filestash is AGPL, so do not copy its code).

### 13.2 Repository layout

```
shelf/
  README.md  SETUP.md  PROGRESS.md  LICENSE
  docs/            dependencies.md  release.md  privacy.md  design-qa.md
  public/          icons, manifest, _headers
  src/
    app/           shell, router, error boundary
    styles/        tokens.css  base.css  fonts.css  (no component styles here)
    ui/            primitives: Button IconButton Input Kbd Badge Meter Tooltip ProviderMark FileGlyph
    components/    FileTable Tree Breadcrumbs AddressBar PendingTray GuardStrip RepoMeter SizeLedger
                   Inspector CommandPalette ContextMenu Dialogs Toasts SplitView ColumnView GridView
    screens/       Connect Library Explorer Viewer Search PendingReview Settings Help Styleguide
    viewers/       pdf image media markdown code csv html
    providers/     types.ts github/ gdrive/ dropbox/ onedrive/ local/ _template/
    services/      guards staging cache search transfer collections diagnostics
    store/         session locations selection staging ui settings
    workers/       pdfIndex.ts pdfSplit.ts hash.ts thumbnail.ts
    lib/           limits.ts paths.ts hashing.ts crypto.ts format.ts errors.ts
    i18n/          en/  hi/
  worker/          Cloudflare Worker for GitHub OAuth only
  extension/       Chrome MV3 "Open in Shelf" helper
  tests/  e2e/  fixtures/   (fixtures are realistic sample data, clearly labelled as samples)
  .github/workflows/ci.yml
```

### 13.3 Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_GITHUB_APP_CLIENT_ID` | GitHub App client id (optional, enables Sign in with GitHub) |
| `VITE_OAUTH_WORKER_URL` | Origin of the OAuth worker |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client id |
| `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID` | Google Picker (optional feature) |
| `VITE_DROPBOX_APP_KEY` | Dropbox app key |
| `VITE_MS_CLIENT_ID` | Microsoft Entra application (client) id |

Every provider is feature-flagged by the presence of its variable; a missing variable hides that provider's Connect row. Nothing secret ever goes in a `VITE_` variable. Secrets live only in the worker.

### 13.4 SETUP.md must contain (the **[HUMAN]** steps, with exact values)

1. GitHub: write the plain-text guide for creating a fine-grained token (this text is also shown inside the Connect dialog), and optionally create a GitHub App with callback URL `<origin>/#/auth/github`, permissions Contents (read and write) and Metadata (read), "Request user authorization during installation" on, user-to-server token expiry on.
2. Google Cloud: create a project, enable the Drive API (and Picker API if used), configure the OAuth consent screen, set publishing status to "In production" so it is not limited to test users, add authorised JavaScript origins, create a web client id, create an API key restricted by HTTP referrer.
3. Dropbox: create an app with "Scoped access" and "App folder", enable the permissions for files read and write, add redirect URIs, note that apps start in development mode with a user limit and need Dropbox approval for production.
4. Microsoft Entra: register a single-page application, supported account types "personal and work", redirect URI `<origin>/`, delegated permission `Files.ReadWrite.AppFolder`.
5. Cloudflare: create the Pages project and the Worker, set the Worker secrets, set the allowed origin.
6. A privacy policy page (`docs/privacy.md`, served at `/privacy`) is required by Google and Microsoft consent screens. Generate it from section 9.6 and 9.8.

### 13.5 Scripts

`npm run dev`, `build`, `preview`, `typecheck`, `lint`, `lint:css`, `test`, `test:e2e`, `test:a11y`, `size` (bundle budget), `check` (typecheck, lint, lint:css, test, build, size).

### 13.6 Coding standards

TypeScript strict; no `any` without a comment explaining why; no default exports except route screens; pure functions in `lib/` and `services/` with unit tests; components under 200 lines (split otherwise); no business logic in components; all user-facing strings via i18n keys; no `console.log` in committed code; errors are typed `ProviderError`s, never thrown strings.

---

## 14. Milestones

Each milestone ends green: `npm run check` passes, `PROGRESS.md` is updated, and the milestone's acceptance items (section 15) are covered by tests.

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| M0 Foundation | Tooling, CI, tokens, fonts, base CSS, primitives, `/styleguide` route showing every primitive in every state, light and dark, three densities, Stylelint rules, contrast test, visual snapshots | Styleguide passes axe and snapshots; banned patterns fail lint |
| M1 Shell and GitHub read | App shell, router, Locations tree, FileTable, address bar, GitHub provider (PAT), listing, Quick Look, PDF, image, Markdown, code viewers, deep links, guard strip (static text), status bar | Browse a real repo, open a PDF, deep link works after reload |
| M2 Guards | `limits.ts`, all verdicts, repo meter, visibility badge, sensitive-name warning, Size ledger (read-only), all guard dialogs, locale keys en and hi | All boundary tests pass; 150 MB file blocked; public push needs the checkbox |
| M3 Staging and push | Staging store, OPFS persistence, Pending tray and review, atomic GitHub push, conflict dialog, history and restore, working-copy export and restore, undo and redo | 3 uploads plus 1 delete become one commit; conflict never overwrites |
| M4 Other providers and moves | Drive, Dropbox, OneDrive providers, Local folder import and export, cross-provider move and copy with verification, Split view, PDF split | Contract suite green for every provider; move verifies hash |
| M5 Library features | Cache with LRU and pinning, offline open, full-text search, command palette, Collections and tags, duplicate finder, ZIP export, Grid and Column views | Offline PDF reopens at the saved page; search returns page numbers |
| M6 Platform | OAuth worker, Sign in with GitHub, Chrome extension, PWA install and update flow, security headers, allowlist test, Settings and Privacy screens | Allowlist test green; Lighthouse PWA at least 90 |
| M7 Release | Accessibility pass (axe plus manual notes), Hindi strings reviewed, Help and onboarding copy, performance budget check, docs, release checklist | Section 15 passes in full on Chromium, Firefox, WebKit |

Feature flags per provider so that M4 can be merged provider by provider if one is blocked on external setup.

---

## 15. Acceptance criteria (all must pass)

1. A 150 MB file cannot be staged for GitHub; the dialog offers other providers and Split (for PDFs); no default action is selected.
2. A 70 MB file requires an explicit confirm; a 30 MB file shows only the "Large" chip.
3. A repo reporting 1.2 GB shows the red meter and the warning on every Push; one at 5.2 GB blocks Push until the override is ticked.
4. Pushing to a public repo is impossible without the unticked-by-default checkbox, which is never remembered.
5. The GitHub guard strip is visible, non-dismissible, and contains the 100 MB and 1 GB wording on every GitHub location and on the Library home.
6. Staging 3 uploads and 1 delete then pressing Push produces exactly one commit on GitHub.
7. Editing a staged file on github.com before pushing triggers the conflict dialog and loses nothing.
8. Open a 20 MB PDF, go to page 50, go offline, reload: it opens at page 50 from cache.
9. Move a file from GitHub to Drive: hash verified, source deleted only after verification; a simulated mismatch leaves the source intact.
10. Force-quit the tab with 5 staged changes and reopen: all 5 are still pending. Export the working copy, wipe local data, restore it: all 5 return.
11. The network allowlist test passes; no token appears in logs, localStorage, sessionStorage, cookies, or URLs.
12. Full-text search finds a phrase on page 12 of a cached PDF and opens the viewer at that page.
13. axe-core reports no serious or critical issues on any screen; keyboard-only completion of connect, browse, stage, review and push is possible.
14. The UI passes the anti-template checklist (5.2): Stylelint finds no hex colours, gradients or backdrop filters outside tokens; the squint, grayscale and 200% zoom reviews are recorded in `docs/design-qa.md` with screenshots.
15. Bundle and performance budgets in section 11 pass in CI.
16. All user-facing strings exist in `en` and `hi`, and contain no em dashes.
17. Wipe local data removes every record, cache file and token, and signs out of all providers.
18. Works at 360px width: Locations as a drawer, Inspector as a bottom sheet, selection mode instead of drag and drop.

---

## 16. Agent working agreement (Codex)

- Work in milestone order. After each milestone: run `npm run check`, update `PROGRESS.md`, commit with a conventional message (`feat:`, `fix:`, `test:`, `docs:`).
- `PROGRESS.md` sections: Status (milestone table with done, partial, blocked), Decisions (what you chose when ambiguous and why), Not done (item, reason), Manual steps needed from the owner, Known issues.
- Definition of done for any feature: code, unit or component tests, an e2e step where it appears in section 15, accessibility behaviour, `en` and `hi` strings, and a line in Help if user-visible.
- UI build order: tokens, primitives, styleguide, composite components, screens (5.11). Do not start a screen before its components exist in the styleguide.
- Use realistic sample data in fixtures (believable file names, sizes and dates), labelled as sample. Never ship lorem ipsum or "Item 1, Item 2".
- Forbidden: `any` without a reason; skipped or deleted tests to get green; mock data in production paths; component kits; Tailwind; raw colours or one-off spacing in components; inline event logic that bypasses services; swallowing errors; adding network hosts outside 9.3; storing tokens anywhere not described in 9.5; copying GitHub or Filestash assets or code; em dashes anywhere in code comments, copy or docs.
- If blocked by a **[HUMAN]** step, build against the MSW mock, mark the item in `PROGRESS.md`, and continue.
- Keep dependencies minimal (9.7). Every new dependency gets a one-line justification in `docs/dependencies.md`.

---

## 17. Design discussion and decisions (senior engineer and product engineer review)

This section records the arguments, so future changes can be judged against them.

### 17.1 Form factor: website (PWA), not a CLI, not a desktop app

**Verdict: build the PWA. Do not build a CLI-first tool. Do not build a desktop app.**

The evidence:
- CLI and TUI tools in this space are one-way downloaders. `git-grab`, `gitgrab` and `gitsnip` fetch a folder from a repo without cloning; `ghgrab` is a terminal browser with previews, LFS handling and batch selection across several Git hosts. That niche is crowded and mostly solved, and none of them offers staging, guards, a document viewer or multiple storage providers.
- For multi-cloud file work, `rclone` already covers 40-plus backends (Drive, Dropbox, OneDrive and many more) with a mature CLI, mounting, and an experimental web GUI, and Electron GUIs already wrap it. In the provider lists seen during research, GitHub was not among rclone's backends (verify before claiming this publicly). Competing on breadth of backends against rclone is a losing game.
- The target users are students and early developers on phones, shared lab machines and locked-down laptops. A website needs no install, no admin rights and no updates, and a link is the whole distribution plan. CLI users already have `git`, `gh` and `rclone`.
- The product's value is visual: a working copy you can see, a size limit you can see, and a document you can read. A terminal cannot show a PDF, and a TUI cannot show the limit line.
- The provider APIs used here (GitHub, Drive, Dropbox, Graph) are callable from the browser. GitHub OAuth is the one exception, handled with a stateless worker and a no-backend token path.

What the web costs, and how Shelf pays it:
- **Storage is not guaranteed.** Safari on iOS can delete site data after about seven days of non-use unless the app is installed to the Home Screen, and persistent-storage requests can be denied. The cache is therefore disposable, and the working copy gets explicit protection (10.13).
- **Local filesystem access is limited.** The directory picker works in Chromium browsers only; Firefox and Safari fall back to a `webkitdirectory` input. So Local folder is import and export only, never a sync target.
- **No mount, no background sync.** Shelf is not a sync client. Say so in Help.

Possible later additions, only if real users ask: (a) a tiny `shelf-guard` Git pre-commit hook or GitHub Action that blocks files near 100 MB before they enter local history, which is a real pain because a committed large file forces a history rewrite; (b) a Tauri wrapper for local-folder sync. Neither is in this release.

### 17.2 Other decisions

| Decision | Why | Trade-off accepted |
| --- | --- | --- |
| Client-only, one stateless worker | Tokens and files never touch a Shelf server; no hosting cost; nothing to breach | No server-side features (shared links, background jobs) |
| Working copy and explicit Push | Review before change; one commit; safe on a shared machine | Unpushed work lives in a browser, so it needs the protections in 10.13 |
| Git Data API for pushes | Only way to make many files one atomic commit without a local clone | More calls; careful handling of empty repos, protected branches, rate limits |
| Hard-coded guards, near-impossible to disable | The product's promise is "you cannot hit the wall by accident" | Power users must use the LFS advanced path or another provider |
| Block at 95 MiB, not 100 | Leaves headroom for API edge cases | Slightly stricter than GitHub |
| Google `drive.file` only | Least privilege, simpler consent verification, honest scope | Cannot browse a user's whole Drive; works on an app folder and picked files |
| PAT first, OAuth worker second | Works with zero infrastructure on day one | PAT setup is clunky; the guided screen has to be excellent |
| OPFS for bytes, IndexedDB for metadata | Large blobs belong in a file system, metadata needs queries | Fallback code path for browsers lacking OPFS |
| No UI kit, no Tailwind, React Aria for behaviour | Look is original, accessibility is battle-tested | More CSS to write and maintain; Stylelint rules enforce discipline |
| Atkinson Hyperlegible Next and Mono | Distinct from default faces, built for letterform clarity in filenames and hashes | Slightly wider than the usual UI faces; budget row widths accordingly |
| Hash routing | Static hosting, deep links, no server config | URLs carry a `#` |
| Four providers behind one interface | Real value is one library across places; interface keeps each provider isolated | Largest scope risk; mitigated with contract tests and per-provider flags |
| No LFS by default | Free quotas are small and silently run out | Heavy files are redirected to other providers instead |
| No telemetry | Trust and simplicity | No usage data; rely on issues and opt-in feedback |
| Do not fork Filestash | Different architecture (Go server, AGPL) and different goal | Rebuilding some viewer features |

### 17.3 Honest assessment (brutal version)

- The demand is real but niche: students and hobbyists who already abuse GitHub as storage. There is no evidence here of a large paying market. Treat Shelf as a free, high-craft tool whose value is credibility, learning and a portfolio piece, not a revenue plan.
- The moat is thin. GitHub could improve its own UI, and Filestash-style tools could add guards. Shelf wins only by being clearly better at three things: the working copy, the guards, and the reading experience. If any of those three is mediocre, the product has no reason to exist.
- Four providers in one release is the biggest execution risk. If time is tight, the shippable core is GitHub plus the guards plus the viewer plus staging. Drive is the first addition. Dropbox and OneDrive can ship behind flags.
- A visually generic UI would kill it. That is why section 5 is strict and enforced by lint rules and visual tests.

---

## 18. Risks and open questions

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Browser data loss for pending changes (iOS eviction, user clears data) | Lost work | 10.13 protections; install hint; backup export |
| GitHub terms or limits change; heavy use of public repos as hosting | Throttling or policy action | Personal-scale positioning, bandwidth note, thresholds in one constants file |
| Google consent screen left in Testing status | Sessions limited to listed test users | SETUP step to publish to production; `drive.file` keeps verification light |
| Dropbox app limited to development mode | User cap | Apply for production approval before public launch |
| OneDrive redirect hosts blocked by CSP | Downloads fail | Observe and allowlist only Microsoft-owned hosts, record in PROGRESS.md |
| Very large PDFs exhaust memory on phones | Tab crash | Stream where possible, page virtualisation, refuse split above 300 MB with a plain message |
| Large scope (four providers, many views) | Late or shallow delivery | Milestones with exit criteria; provider flags; shippable core defined in 17.3 |
| Name collision (several products are called Shelf) | Trademark and search confusion | Pick a final name, check domain and trademarks before launch |
| Security bug in rendering untrusted content | Token theft | 9.4, CSP, sandbox, sanitiser, security tests with hostile fixtures |

Open questions for the owner: final product name and domain; MIT or another licence; who reviews the Hindi strings; whether the Chrome extension ships in the first public release; whether to offer a hosted worker or ask each deployer to run their own.

---

## 19. References (consulted during research)

- GitHub: acceptable use policies (bandwidth and object storage guidance); OAuth app authorisation docs (token exchange, no PKCE or CORS preflight); the GitHub OAuth proxy project describing the browser CORS limitation.
- Google Drive API: choosing scopes (`drive.file`, Picker) at developers.google.com/drive/api/guides/api-specific-auth.
- Dropbox OAuth guide (PKCE for single-page apps) at developers.dropbox.com/oauth-guide.
- Microsoft Entra: JavaScript SPA auth code flow with PKCE at learn.microsoft.com/entra/identity-platform/quickstart-v2-javascript-auth-code.
- MDN: storage quotas and eviction criteria (developer.mozilla.org/en/docs/Web/API/IndexedDB_API/Browser_storage_limits_and_eviction_criteria); iOS Safari PWA limitations notes (swoff.netlify.app/docs/concepts/ios-safari-limitations); web.dev, "How to open a directory" (File System Access API support).
- Prior art: Filestash (self-hosted file manager); rclone (rclone.org); `git-grab` (github.com/hews/git-grab), `gitgrab` (github.com/sachinsmc/gitgrab), `ghgrab` and `gitsnip` (terminaltrove.com); Carelo (github.com/aheinze/carelo); Column Explorer for Obsidian; OneCommander folder columns documentation.
- Design critique of generated interfaces: "10 signs of AI generated design" (pub.towardsai.net), "Escaping AI slop" (noqta.tn), "How to avoid that vibe coded look" (robotsonpayroll.substack.com).
- Typeface: Braille Institute, Atkinson Hyperlegible Next and Mono (brailleinstitute.org/freefont), Fontsource package page.
