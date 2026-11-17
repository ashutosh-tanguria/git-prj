# Manual M3a verification

Use a real disposable initialized repository and a short-lived fine-grained token with Contents read and write and Metadata read. Never paste the token into chat. These steps have not been verified against a real account.

1. Connect through the app. Browse a folder and drop three small files. Confirm the guard review, then Stage. Verify Pending appears only after saving.
2. Reload, reconnect, and verify all three files remain pending. Download the working-copy ZIP. Discard changes and restore the ZIP. Verify names and bytes.
3. Exercise Undo, Redo and per-row Discard. Confirm unrelated changes remain intact.
4. Set a commit message and Push. Inspect GitHub: all pending files should appear in one commit. Verify the author and branch.
5. Stage a modification, then change that path on github.com. Push and verify a conflict appears, no choice is preselected and nothing is overwritten. Test each resolution using disposable files; Keep mine requires a second confirmation.
6. Test a protected branch. Verify failure retains pending work. Test a public target and confirm Push requires a fresh public checkbox.
7. Open History for a file in Details and restore a small version. Verify it is staged, not pushed immediately.
8. Test an empty throwaway repository: review the initial Contents commit and subsequent commit boundary. Multiple initial files require initialization plus a normal batch commit.
9. Close the tab while pending work exists and check the browser warning. Check the persistence notice and iOS Add to Home Screen hint where applicable.
10. Revoke the token and remove the disposable repository when finished. Record results without credentials.
