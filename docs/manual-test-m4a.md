# M4a provider acceptance

On PowerShell, set `$env:VITE_MOCK_PROVIDERS = "1"` and run `npm run dev` in a local secure context. The preview test build accepts the same flag. The production build ignores the mock flag. Start with no provider variables and confirm that the cloud providers are hidden.

1. Connect Google Drive, Dropbox and OneDrive. Confirm each appears in Locations and lists its Shelf app folder. Switch between them and GitHub when connected. In Settings, disconnect and reconnect each provider and check its status.
2. Open a folder, select a file, download it, and use Versions to download a saved revision. Check that the status bar shows provider-reported free space. The mock quota triggers the under-5-percent warning.
3. Stage three uploads called `first.txt`, `fail-once.txt` and `last.txt`. Push. The second request returns 429 with a 30-second Retry-After. Check that the first item leaves Pending, the other two remain, and the third is absent remotely. Retry and confirm each item exists once.
4. In a mocked browser test, force a 401 during Push and verify the provider disconnects without removing its unconfirmed staged items. Reconnect as the same mock account and retry. With a changed version or an existing destination name, confirm Push stops. If a response was lost, review the provider before discarding or staging the item again.
5. Stage a rename, a same-provider move, a replacement and a delete. Verify no action changes the provider until Push. Check the delete disclosure and that the item is recoverable from Drive Trash, Dropbox Deleted files or the OneDrive recycle bin.
6. Repeat in Hindi and at 360 px. Check the labels, keyboard navigation and that pending changes survive a reload. Inspect storage for credentials and network traffic for unexpected origins.

## Owner OAuth acceptance

Use the setup steps in PROGRESS.md and disposable accounts. Confirm the scope, app folder, permission errors, refresh behavior, uploads above the documented slice thresholds, quota and history. Check the delivered CSP and exact redirect registration. For OneDrive, capture the hostnames of signed requests without collecting signed URLs, tokens or file contents. Only Microsoft-owned hosts may be added after verification.
