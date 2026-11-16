# Shelf setup

## [HUMAN] steps

- M0: review Styleguide snapshots, Hindi font rendering and design QA. Choose a remote/CI repository. M0 is local and needs no provider credentials.
- M1: create an initialized disposable GitHub repository; fine-grained PAT restricted to selected repositories with Contents read/write and Metadata read. Paste tokens only in the future in-memory Connect form.
- M2: review guard wording, units, public and sensitive-name confirmations in English and Hindi.
- M3: designate disposable write targets, empty/protected branches, and authorize test commits; validate backup restore and conflict outcomes.
- M4: create Google project/web OAuth client with Drive API and optional Picker API, drive.file only; set authorized origins, project number, referrer/API-restricted key, consent branding and privacy URL. Add test users then publish to production as appropriate. Create Dropbox Scoped access/App folder app with metadata/content read/write and account_info.read where needed; register exact callback and request production approval. Register Entra SPA for personal/work accounts with Files.ReadWrite.AppFolder and exact callback; obtain tenant consent. Supply disposable accounts and review observed Microsoft transfer hosts. Advanced LFS needs a configured test repo and feasibility review before use.
- M5: check offline/persistence/backup on Android and iOS; optionally choose a staged roaming-collections location.
- M6: create GitHub App with Contents read/write, Metadata read, installation authorization and expiring user tokens. Deploy Pages and OAuth Worker, set Worker secrets and exact CORS origin/rate limits. Review public privacy page, install/update behavior and unpacked MV3 extension; arrange store account if publishing.
- M7: choose final name/domain, update registered origins/callbacks/privacy URL, complete Google/Dropbox/tenant approvals, designate Hindi and NVDA/VoiceOver reviewers, finish device/performance/real-account checks and release approval.

The full values, proposed callback templates and evidence requirements are in [analysis section 7](docs/ANALYSIS.md#7-full-human-steps-by-milestone). Actual origins and account IDs are not yet known. Never put tokens or secrets in VITE variables or repository files.

## Local foundation

Use Node 24.19.0 and npm 11.17.0. Run npm ci (lifecycle scripts stay disabled), then npm run dev and open http://localhost:5173/#/styleguide. The product root now opens the GitHub token connection screen. GitHub explorer/viewer deep links are supported; a reload requires reconnection because credentials remain in memory.

Run npm run check. For visual/a11y tests run npx playwright install chromium, then npm run test:e2e. Browser downloads are explicit development setup, separate from the application's runtime host allowlist. Snapshot baselines use Windows, matching CI. To review an intentional change, run npm run test:e2e -- --update-snapshots and inspect every changed image before committing.

npm run build creates a production shell with no workbench or sample import. npx vite build --mode styleguide creates dist-styleguide for local/test review only. Do not deploy that test build as the product.

M1 checkpoint: npm run test:e2e runs GitHub flows against MSW fixtures without contacting a real account. Real private repository/PDF verification requires the [HUMAN] M1 test account and PAT described above. The current checkpoint is partial; see PROGRESS.md before advancing milestones.
