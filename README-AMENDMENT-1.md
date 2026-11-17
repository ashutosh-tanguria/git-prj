# README Amendment 1

This amendment overrides README.md wherever they conflict. Agent: first merge these changes into README.md (keep section numbers, edit in place), then build from the merged README. Record the merge in PROGRESS.md.

Reason for the amendment (owner feedback after M1):
1. The UI is too plain. It must be colourful in the way GitHub is colourful, and laid out like Windows File Explorer.
2. Pushing, creating a new repository, choosing a folder inside the repo, and commit messages must all work from buttons, with messages written automatically.
3. Some default shortcuts are reserved by browsers and cannot work.

Nothing in this amendment relaxes sections 5.2, 8 or 9.

---

## A1. Colour system v2 (replaces the values in 5.3, 5.6 and the glyph colour rule)

Principle: colourful, but colour always means something. Colour is assigned by role (action, state, file type, provider), never as decoration. The bans in 5.2 still hold: no gradients, no glow, no glass, no purple-to-blue washes. Violet is allowed only as the "moved or renamed" role and for video files.

### A1.1 Tokens

All pairs below were checked numerically for WCAG contrast. Keep the automated contrast test and add every pair listed in A1.3.

```css
:root {
  /* surfaces */
  --canvas: #F6F8FA;        /* app background, navigation pane, command bar */
  --pane: #FFFFFF;          /* file list and viewer background */
  --raised: #FFFFFF;        /* menus, dialogs, popovers */
  --hover: #EEF1F4;
  /* ink */
  --ink-1: #1F2328;         /* 15.8:1 on pane */
  --ink-2: #59636E;         /* 6.1:1 on pane */
  --ink-3: #656D76;         /* 5.3:1 on pane, 4.9:1 on canvas */
  /* lines */
  --rule: #D1D9E0;          /* decorative separators */
  --rule-control: #848D97;  /* borders of inputs and buttons, 3.4:1 on pane */
  /* roles */
  --blue: #0969DA;          /* links, selection accent, focus ring (5.2:1 on pane) */
  --blue-ink: #0550AE;      /* blue text on blue tint (6.7:1 on tint) */
  --blue-tint: #DDF4FF;     /* selected row, active nav item */
  --green: #1A7F37;         /* primary action (Push, Create), added (5.1:1 with white text) */
  --green-hover: #116329;
  --green-tint: #DAFBE1;
  --red: #CF222E;           /* delete, block, danger (5.4:1 on pane) */
  --red-tint: #FFEBE9;
  --amber: #9A6700;         /* warn, large file (4.5:1 on its tint) */
  --amber-tint: #FFF8C5;
  --violet: #8250DF;        /* moved or renamed (5.1:1 on pane) */
  --violet-ink: #6639BA;    /* violet text on violet tint (6.6:1) */
  --violet-tint: #FBEFFF;
  --orange: #BC4C00;        /* Git LFS, attention */
  --orange-tint: #FFF1E5;
  /* folder glyph */
  --folder: #B58900;        /* 3.2:1 on pane, graphic only, always paired with a text name */
  --folder-fill: #F4D676;
  /* file type families (glyph tag colours) */
  --t-pdf: #CF222E;  --t-doc: #0969DA;  --t-sheet: #1A7F37;  --t-slide: #BC4C00;
  --t-image: #0E7C7B; --t-video: #8250DF; --t-audio: #BF3989;
  --t-code: #9A6700; --t-text: #59636E;  --t-archive: #6E5A3A;
}
@media (prefers-color-scheme: dark) {
  :root {
    --canvas: #010409; --pane: #0D1117; --raised: #161B22; --hover: #1C2128;
    --ink-1: #E6EDF3; --ink-2: #9198A1; --ink-3: #8B949E;
    --rule: #30363D; --rule-control: #6E7681;
    --blue: #4493F8; --blue-ink: #79C0FF; --blue-tint: #1A2B42;
    --green: #238636; --green-hover: #2EA043; --green-tint: #12261A;
    --red: #F85149; --red-tint: #33201E;
    --amber: #D29922; --amber-tint: #2E2616;
    --violet: #A371F7; --violet-ink: #D2A8FF; --violet-tint: #2A1F3D;
    --orange: #F0883E; --orange-tint: #2E1F14;
    --folder: #D4A72C; --folder-fill: #7A6420;
    --t-pdf: #F85149; --t-doc: #4493F8; --t-sheet: #3FB950; --t-slide: #F0883E;
    --t-image: #39C5BB; --t-video: #A371F7; --t-audio: #DB61A2;
    --t-code: #D29922; --t-text: #9198A1; --t-archive: #B8A06A;
  }
}
```

Dark-theme notes: white text on `--green` is 4.6:1; `--blue` on `--pane` is 6.1:1; `--blue` on `--blue-tint` is 4.6:1; `--rule-control` on `--pane` is 4.1:1. Values for `--t-*` and `--*-ink` families that are not listed above must be checked by the contrast test and nudged until each passes 4.5:1 for text or 3:1 for graphics.

### A1.2 Roles (use exactly these)

| Role | Colour | Used for |
| --- | --- | --- |
| Navigation and selection | blue | Links, selected row tint, active nav item, focus ring, "Open" actions |
| Primary action | green | The one primary button per surface: Push, Create repository, Stage anyway is NOT green (see below) |
| Added | green marker and tint | Pending add marker, "Added" chips in Review |
| Delete, block | red | Delete marker, strike-through name, blocked verdicts, Delete button |
| Warn, large | amber | 50 to 95 MB verdict, repo over 1 GB, "Large" chip |
| Moved or renamed | violet | Rename and move markers and chips |
| LFS, attention | orange | LFS pointer rows, advanced options |
| Folder | folder amber | Folder glyphs (outline plus fill) |

"Stage anyway" and other confirm-risky actions use the neutral secondary button, never the green primary. Only one green button per dialog.

### A1.3 Pairs added to the contrast test

Text and UI pairs (must pass 4.5:1 for text, 3:1 for control borders and graphics): ink-1, ink-2, ink-3 on pane and on canvas; blue on pane, canvas and blue-tint; white on green; white on blue; green on green-tint; red on pane and red-tint; amber on amber-tint; violet on pane and violet-ink on violet-tint; orange on orange-tint; rule-control on pane and canvas; folder on pane (graphic, 3:1); every `--t-*` on pane (graphic or tag text); and the same set for dark.

### A1.4 Where colour appears

- File glyphs: neutral document silhouette with a coloured extension tag from `--t-*`; folders are amber (outline and fill). Row hover is `--hover`; selected row is `--blue-tint`.
- Provider marks (5.7) keep their shapes; hues may be brightened to this palette but must stay distinct without colour.
- Tags and collections: eight label colours drawn from this palette (blue, green, red, amber, violet, orange, teal, pink), always with the text label.
- Repo visibility badges: Private is neutral with a lock glyph; Public is amber with a globe glyph (it is the risky state).
- Size column weight rule: green below 50 MB, amber 50 to 95, red at 95 and above.
- Navigation pane: section headings in `--ink-2`, active item on `--blue-tint` with `--blue-ink` text.

Anti-template check still applies. Colourful is not the same as decorated: if a coloured element has no meaning from the table above, remove the colour.

---

## A2. Layout v2: File Explorer structure (replaces 5.9)

```
+-------------------------------------------------------------------------------------------------+
| [+ New v] [Upload] [New repository] | [Cut][Copy][Paste][Rename][Delete] | [Sort v][View v]  [Push 3] |  command bar (canvas)
+-------------------------------------------------------------------------------------------------+
| [<][>][^][refresh]  GitHub > ada > notes > semester-5 >                  [Search semester-5   ]  |  address row
+----------------------+---------------------------------------------------+----------------------+
| Quick access         | Name                 Date modified  Type    Size  | Preview              |
|  Recent              | [folder] week-1                                    |                      |
|  Favorites           | [pdf] algorithms.pdf 2 days ago     PDF    14 MB  |  (preview or         |
|  Pending (3)         | [pdf] os-notes.pdf   5 days ago     PDF    63 MB  |   details)           |
| This library         | [md]  README.md      3 weeks ago    MD     2 KB   |                      |
|  v GitHub            |                                                    |                      |
|    > ada/notes       |                                                    |                      |
|  v Google Drive      |                                                    |                      |
| Collections          |                                                    |                      |
+----------------------+---------------------------------------------------+----------------------+
| Pending 3: 2 added, 1 renamed  +38 MB   [Review]  [Push to ada/notes/semester-5]                |  pending tray
+-------------------------------------------------------------------------------------------------+
| GitHub: files under 100 MB, repositories under 1 GB.  ada/notes 612 MB of 1 GB                   |  guard strip
+-------------------------------------------------------------------------------------------------+
| 12 items   2 selected  14.2 MB                          Online   API calls left 4,812             |  status bar
+-------------------------------------------------------------------------------------------------+
```

Rules:
- **Command bar** (new): buttons with icon and label, grouped by dividers like Windows File Explorer. Labels collapse to icons below 1100px. Disabled buttons keep their place and show a tooltip stating why ("Select a file", "Available after M3").
  - New (menu): New folder, New repository, Upload files, Upload folder.
  - Cut, Copy, Paste: stage a move or copy within a provider or across providers (A4). Ctrl+X, Ctrl+C, Ctrl+V when the file list has focus and no text field is focused. Paste shows what will be staged before it does.
  - Rename, Delete: stage the change (never immediate remote action).
  - Sort and View menus: sort by name, date, type, size; views List (Details), Grid, Columns.
  - Push button: right-aligned, green, shows the pending count. It is the same action as the Push button in the Pending tray.
- **Address row**: back, forward, up, refresh, editable breadcrumbs, and a search box scoped to the current folder (Ctrl+F focuses it). Ctrl+K stays the global palette.
- **Navigation pane**: "Quick access" (Recent, Favorites, Pending with count), "This library" (providers, then locations as a tree), "Collections". Active item uses blue tint. Resizable and collapsible.
- **Details list** (default view): columns Name, Date modified, Type, Size, plus Last change for GitHub. Column widths are resizable. Rows are 32px by default.
- **Preview pane** on the right: preview or details tab as before.
- **Status bar**: item count, selection count and total size, plus provider status. Same style as File Explorer.
- Keep the guard strip and weight rule from 5.9. Keep the responsive rules from 7.2, with the command bar becoming a scrollable icon row and then a "..." overflow menu on narrow widths.

---

## A3. Create repository (new section 6.17)

Entry points: command bar New menu and the "New repository" button, the command palette, an inline "Create a new repository" row when the Push dialog's repository list is empty, and the keyboard shortcut in A6.

Dialog fields:
- **Owner**: the signed-in user, plus organisations the token can create repositories in (if the token cannot list organisations, show only the user).
- **Name**: validated live. Allowed characters letters, digits, `.`, `-`, `_`; no spaces (suggest hyphens); up to 100 characters; reject reserved names. Availability check with `GET /repos/{owner}/{name}` (404 means free). Show the result inline.
- **Visibility**: Private (default, pre-selected) or Public. Choosing Public shows the public warning and requires the unticked-by-default checkbox from 8.5 before the Create button enables.
- **Description**: optional.
- **Add a README file**: ticked by default. It creates the first commit, which avoids the empty-repository limitation of the Git Data API (10.3).
- **Default branch**: `main`.
- Primary button: "Create repository" (green). Secondary: Cancel.

After creation: add the repo as a Location, select it, open it, show a toast "Created ada/semester-notes (private)". If creation fails, show the specific reason (name taken, permission, rate limit).

Capability handling (important):
- Whether a fine-grained personal access token can create repositories depends on its permissions and repository access (likely it needs repository Administration write access and access that covers repositories that do not exist yet, which in practice may mean "All repositories"). A classic token with the `repo` scope can. This is **unverified**: the agent must read GitHub's current REST documentation for "Create a repository for the authenticated user" and "Permissions required for fine-grained personal access tokens", record the finding in PROGRESS.md, and implement capability detection.
- If the API refuses (403, 404, 422 due to permissions), show: "This token cannot create repositories." with two actions: **Create on github.com** (opens `https://github.com/new` in a new tab; add `?name=<name>&visibility=<private|public>` prefill parameters only if verified to work) and **How to allow it** (shows the token settings needed). After the user creates it on GitHub, a "Refresh repositories" button picks it up.
- Connect dialog presets (replace the single token guide): **Recommended: read and push selected repositories** (Contents read and write, Metadata read, selected repos) and **Also create repositories** (adds what research shows is required, with a warning that this token is broader). Never suggest classic tokens as the default.

---

## A4. Push destination, folders, automatic commit messages, one-click push (amends 6.7)

### A4.1 Destination model

Every staged change belongs to a **destination**: provider, location (for GitHub: owner/repo and branch), and **folder path** inside it (empty means the repository root). Dropping files into a folder you are browsing sets the destination to that folder. Uploading while the browsing location is the library home asks for a destination in the Push popover.

### A4.2 Push popover (default) and full dialog

Pressing Push (button, tray or shortcut) opens a compact **popover** anchored to the button, not a full-screen dialog:
- Destination line: repo, branch, and folder, with a Change link. The folder field has autocomplete over existing folders and a "Create folder `semester-6/week-2`" option that simply adds that path to the commit (Git folders exist only as paths).
- Automatic commit message (A4.3), editable in place.
- Guard summary chips (all must be ok or warn-confirmed).
- Big green button: "Push to ada/notes/semester-5".

The popover expands to the full Push dialog from 6.7 when any of these is true: a blocked item exists, a warn item needs confirmation, the repository is public, a sensitive-name warning fired, the destination changed since last push, or there is a conflict.

### A4.3 Automatic commit messages

Generate in English, imperative mood, subject at most 72 characters, no trailing period, using the staged changes and destination folder. The user can edit it; the edited text is used as is.

| Situation | Message |
| --- | --- |
| One file added | `Add algorithms-week3.pdf` |
| Several files added to a folder | `Add 3 files to semester-5 (2 PDFs, 1 image)` |
| One rename | `Rename os-notes.pdf to os-notes-v2.pdf` |
| One delete | `Delete old-draft.pdf` |
| Mixed | `Update semester-5: add 2 files, rename 1, delete 1` |
| Many (over 8) | Subject as above, plus a body listing each change on its own line (`A path`, `M path`, `D path`, `R old -> new`) |
| Moved from another provider | `Add algorithms.pdf (moved from Google Drive)` |

Pure function in `src/services/commitMessage.ts` with unit tests for every row and for truncation at 72 characters. No network, no AI.

### A4.4 One-click push

- **Pinned destination**: a toggle "Always push here" on a location or collection stores a default destination. With a pinned destination, files you stage already carry it.
- **Quick push**: when every guard is ok, the repository is private, and the destination equals the pinned or last-used one, the popover shows only the destination, the generated message and the green button; one click pushes. This still passes through every guard (section 8 is never skipped) and still shows a success toast with "View commit on GitHub".
- Quick push never applies to public repositories, warn or block verdicts, conflicts, or first use of a destination.

### A4.5 Cut, Copy, Paste semantics

Cut then Paste stages a move (copy to the destination, then delete the source after verification, as in 6.11). Copy then Paste stages a copy. Paste into a different folder of the same GitHub repo stages a rename (path change) that reuses the existing blob and uploads nothing. The paste preview lists what will be staged and runs the guards first.

---

## A5. Layout of the Connect and Library home screens

Use the same File Explorer structure: the navigation pane shows providers; the main area shows "Connect a location" rows (6.2) or the Recent files table. No separate marketing-style layout.

---

## A6. Keyboard shortcut corrections (amends 6.16)

Browsers reserve some shortcuts, so a web page cannot use them: `Ctrl+Shift+N` (private or incognito window in Chrome and Edge) and `Ctrl+Shift+P` (private window in Firefox). Both are removed from the README.

New defaults (the agent must test each in Chrome, Edge and Firefox on Windows, and replace any that conflict, recording the result):

| Action | Default |
| --- | --- |
| New repository | `Alt+N` |
| New folder | `Alt+M` |
| Push (opens the Push popover) | `Alt+P` |
| Upload files | `U` (when the file list has focus) |
| Cut, Copy, Paste | `Ctrl+X`, `Ctrl+C`, `Ctrl+V` (file list focus only) |
| Focus search | `Ctrl+F` inside the app's file list (falls back to the browser find outside it) |

All shortcuts must also exist as buttons and in the command palette, and be remappable in Settings, which moves the shortcut registry from "later" to M3. Never hijack a shortcut while a text field has focus.

---

## A7. Milestone changes

- Insert **M1.5 UI v2** before M2. Scope: A1 colour tokens and contrast tests, A2 layout (command bar, address row, navigation pane, details list columns, preview pane, status bar), colourful file glyphs, updated styleguide and snapshots. Buttons for features that arrive later (New repository, Cut, Copy, Paste, Push) are visible but disabled with a tooltip naming the milestone; no placeholder behaviour.
- **M3 additions**: A3 create repository with capability detection and fallback, A4 destinations, folder picker, automatic commit messages, push popover and quick push, A4.5 cut, copy, paste, the shortcut registry from A6.
- **M2 unchanged.**

### New acceptance criteria (add to section 15)

19. With a token that can create repositories, New repository (button and `Alt+N`) creates a private repo with a README and opens it; with a token that cannot, the fallback message and the github.com link appear.
20. Staging 3 files while browsing `semester-5/` and pressing Push shows the popover with destination `.../semester-5` and an automatic message; one click produces exactly one commit adding those files into that folder.
21. Typing a new folder path in the destination field creates that path in the commit.
22. Quick push never appears for a public repository or a warn or block verdict.
23. Cut and Paste across two folders of one repo stages renames without uploading file bytes.
24. Every commit message rule in A4.3 has a passing unit test, including 72-character truncation.
25. The colour contrast test passes for every pair in A1.3 in light and dark.
26. The shortcut conflict check for `Alt+N`, `Alt+M`, `Alt+P` is recorded for Chrome, Edge and Firefox.
