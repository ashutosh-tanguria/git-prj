# Shelf privacy

Shelf has no telemetry, analytics or crash reporting. The browser communicates with the storage providers you connect and with the isolated sandbox when you run a preview. The OAuth Worker relays GitHub App codes and credentials only for token exchange, refresh and revocation. It has no persisted tokens or file bytes. The sandbox receives selected file bytes and paths.

| Data | Where | Retention |
| --- | --- | --- |
| Remembered GitHub refresh credential | Encrypted IndexedDB | Until disconnect or wipe |
| Cached file bytes | OPFS, with IndexedDB fallback | Least-recently-used eviction at your cap. Pinned files stay. |
| Listings, metadata and ETags | IndexedDB | Listing expiry and invalidation |
| Staged changes and bytes | IndexedDB records and OPFS bytes | Until pushed or discarded |
| PDF text index | IndexedDB | Until the file changes or the cache is cleared |
| Settings, collections and tags | IndexedDB | Until wipe |

Settings → Privacy lists hosts and can copy redacted diagnostics to your clipboard. Settings → Storage can clear the cache or wipe local data. The public notice is served at `/privacy/`.
