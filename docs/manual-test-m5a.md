# M5a manual acceptance

Use a disposable account and a private test repository. The automated browser cases use generated files and local provider responses. Inspect Storage from Settings on each browser you plan to support.

## Cache and offline

1. Open a 20 MB PDF, go to page 50 and wait for the page to render. Turn the network off, reload the tab and verify that Shelf says Offline and opens page 50. The deployed preview must be served over HTTPS or on localhost so the service worker and OPFS can run.
2. Pin a file with Keep offline in its context menu or the command bar. Open two other files, lower the cache limit in Settings and confirm the pinned file still opens. Confirm that clearing the cache removes cached files and search indexes while leaving staged changes and their bytes intact.
3. Open a cached file again after changing it remotely. Verify that the viewer and search show the new version. Use Refresh or Ctrl+R to force a folder check. With an ETag visible to the browser, confirm the next refresh sends If-None-Match and handles a 304 response.
4. With a connected session, go offline and open Review pending. Push should be disabled and explain why. Stage a new file in a cached location. Select Push when back online for the reviewed batch and restore connectivity. Verify that the usual guards still apply. Repeat with the checkbox cleared and verify that no automatic push runs. Changing which items are pending cancels the earlier batch authorization.
5. With GitHub and each configured cloud provider connected, populate the cache and stage a disposable draft. Open another Shelf tab. Confirm Wipe all local data and verify that all sessions return to Connect, the cached files and draft disappear, and the storage limit and reading position reset. If you wipe while offline, restore connectivity for the app shell to reload.

## Search and keyboard

1. Open a PDF with a distinct phrase on page 12. Use Ctrl+K, type ? followed by that phrase and choose the result with Arrow Down and Enter. Check the provider mark, path, page number, snippet and highlighted viewer match.
2. Open a Markdown file, a text file, a scanned PDF and a cached file larger than 150 MB. Verify that text files appear in full-text results and that notices distinguish scanned PDFs from files skipped for size. During a batch, cancel indexing and resume it. Verify that browsing remains responsive.
3. Focus the file list and use Ctrl+F. Type a partial filename and check that only the current folder is filtered. Escape clears the filter and returns focus to the list.
4. Exercise > commands, / filenames, ? full text, @ locations and # tags. Check that the ZIP action is disabled and that tags report No tags yet. Verify Arrow Up, Arrow Down, Enter, Escape and focus restoration with your keyboard and screen reader. Switch view opens the existing Split view and returns to Explorer.
5. Open the Styleguide in light and dark, switch to Hindi and verify that the palette, indexing, Offline and Storage controls remain readable at 360 px and at 200% zoom.

## Local validation

- Run `npm run check` for typechecking, lint, CSS policy, unit tests, build and bundle budgets.
- Run `npx playwright test e2e/m5a.spec.ts` for the M5a Chromium cases.
- Real-account OAuth, conditional headers, browser storage policies and physical-device behavior still require the owner checks above.
