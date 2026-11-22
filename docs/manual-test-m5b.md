# M5b manual acceptance

Use a private GitHub test repository and a connected cloud test account. Use disposable files for tests involving Push or recoverable delete.

## Quick access, collections and tags

1. Open files from both providers. Select Recent and verify that the last opened file appears first and that reopening a file moves it to the top. Check the Provider column and open a file from each provider.
2. Star a file in its context menu. Select a second file and star it in the command bar. Check its star in the Inspector and toggle it there. Verify that Favorites reflects each change.
3. Make a collection. Add a GitHub item from the context menu and drag a cloud item onto the collection in Locations. Verify the two provider labels and open both source items. Reconnect after reload and confirm the same collection and references are available.
4. Create tags using the eight colour options. Verify that the text and shape distinguish them in forced colours. Open the palette, type `#` followed by part of a tag name, and activate the result by keyboard.
5. Expand Import or export collections in Locations. Stage an export and choose a folder in an owned location. Verify that Pending contains `.shelf/collections.json`, then review and Push. Open that folder in another browser profile with the same accounts connected, and import. Confirm that both tags and collections merge and that import leaves source files intact. Import the same file again and check for duplicate references.

## Explorer views

1. Open View and choose Grid. Try 120, 160 and 200 px. Verify that a PDF shows page one, a supported image shows a scaled thumbnail and an unsupported file shows its glyph. Switch away and back and verify that cached thumbnails can be shown offline.
2. In a large folder, scroll in Grid and use Home, End, the arrow keys and Shift selection. Check with a screen reader that focus position and selected state are announced. Repeat with a 10,000-item folder on target hardware.
3. Choose Columns from the palette. Select a folder and verify the next column header shows its item count. Use Right to enter the column and Left to return. Resize a column with its separator using mouse and keyboard. Select a file and inspect the preview in the last pane.

## Duplicates and ZIP

1. List identical files with different names on both providers, including one cached for offline use. Include another file of the same size with different contents. Run Find duplicates. Verify the identical files are grouped and the differing file is excluded.
2. Use Select all but one per group. Verify a retained file cannot be selected until another copy is cleared. Review the selected deletes by provider or GitHub branch. Confirm they appear in Pending and provider contents only change after Push.
3. Export a selection through Export selection as ZIP. Repeat from an open collection with Export collection as ZIP, including a folder, an empty folder and matching filenames from different providers. Open the archives and compare filenames, nested paths and bytes. Repeat with previously cached files while offline.
4. Export a large selection and cancel while ZIP progress is visible. Verify no download started. Try an archive over 100 MiB and check the limit message.

## Locale and accessibility

Open the Styleguide in light and dark, then in Hindi at 360 px. Check the collection tree, all eight tag markers, Grid, Columns, duplicate groups and ZIP progress. Repeat with forced colours, keyboard navigation and 200% zoom.
