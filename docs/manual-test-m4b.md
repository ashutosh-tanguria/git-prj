# M4b owner acceptance

Use a disposable Google Drive account and an initialized private GitHub repository with a disposable branch. Register the Drive client with the app's exact browser origin and enable the Drive API. Connect GitHub with a short-lived, repo-scoped Contents read/write token. Keep the credentials in the app's connection UI and revoke them after testing. Use non-sensitive sample files.

## Move, copy and recovery

1. Put a small file in GitHub and connect Drive. Use File actions or the command bar to choose Move to, select Drive and a destination, preview, and stage. Confirm each provider is unchanged and Pending shows one move with a recoverable GitHub delete. Push and start the transfer. Confirm the destination bytes match the original, the path disappears from the branch, and an earlier GitHub commit still contains it.
2. Copy the same file from Drive back to GitHub. Confirm a GitHub commit contains the copy and Drive still lists the source. Try an existing destination. Check Cancel stages nothing, Keep both chooses an unused name, and Replace changes only the file reviewed.
3. Stage a move and reload. Reconnect the same accounts, reopen Pending and start the retained row. Repeat by closing during a larger upload and resuming after reconnect. Inspect both providers for a single copy and verify the displayed state before retrying. Confirm cancellation during reading or writing keeps the source. Download a transfer backup, cancel a staged local import, and restore the backup. Confirm the restored draft is staged and requires a new Push.
4. In a disposable public repo, test the unchecked public confirmation. In a private repo, try a warning-size upload and a sensitive-looking sample filename. Confirm their acknowledgements are required. Try staging a 95 MiB GitHub target file and confirm the block. For mismatch, lost responses and all journal checkpoints, use the deterministic MSW tests in `tests/transfer.test.ts`.
5. Move a small Drive file to the repo. Confirm it lands in Drive Trash and can be restored. Cancel or fail a second file in a batch and confirm its source stays even after another row succeeds.

## PDF, Split view and Local folder

6. Try a generated PDF larger than the GitHub staging limit with several independently sized pages. In the upload block dialog, select Split into parts and review the measured additions. Confirm sequential `.part1.pdf` names, page order, parts at most 90 MiB, and the original bytes unchanged. Repeat from the Size ledger with a PDF already in the repo. Check the plain message above 300 MiB and for a single page over 90 MiB.
7. Toggle Split with Ctrl+\ and navigate one pane while leaving the other in place. Change one view and check each Back and Forward control. Drag a file across to stage a copy, then Shift-drop to stage a move. At 360 px with touch, select a file and use the Move to or Copy to button. Check the drawer, sheet, and Hindi labels.
8. Import a folder with nested paths and export selected files to a fresh local destination. Inspect file names and bytes. Repeat in a browser without the directory picker, using the browser folder input and the ZIP download. Confirm local folders are absent from the cloud destination list.
