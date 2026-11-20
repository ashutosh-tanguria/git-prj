# README Amendment 3: Managed third-party rendering (paid tier)

Extends Amendment 2 (online viewing). Overrides README.md and Amendments 1 and 2 where they conflict. Agent: merge into README.md in place (extend section 6.5b and section 9), keep numbering, log the merge in PROGRESS.md.

Owner decision: the owner is willing to pay third-party services to do heavy rendering so that Shelf does not carry that load itself. Client-side tiers stay the default. Paid third-party tiers are an opt-in addition, never a replacement.

---

## C1. New tiers

| Tier | Content | What it does | Candidate vendors (adapters, vendor-neutral) |
| --- | --- | --- | --- |
| P Managed document render | DOCX, XLSX, PPTX, ODF, legacy DOC and PPT | A vendor converts the file to PDF; Shelf shows the PDF in its own viewer | CloudConvert (managed, first adapter); Gotenberg (open-source LibreOffice service, self-hosted later); ConvertAPI or Cloudmersive as alternates |
| E Cloud sandbox | Websites and projects that need a server (Node backends, Python, Docker, databases) | A short-lived cloud VM runs the project and Shelf embeds the preview URL | CodeSandbox SDK (first adapter, Firecracker microVMs); E2B as an alternate |

Order of offering to the user: Tier 1 Quick view, Tier 2 High fidelity (WebAssembly), Tier 3 Cloud render through the user's own OneDrive or Drive, then Tier P, with Tier E for projects. Tier P and E are shown only when the worker reports them enabled and within budget.

Facts gathered at research time (verify before relying on them): CloudConvert bills by conversion minutes and has subscription plans starting at about 8 USD per month with about 1,000 conversion minutes; it deletes files after a retention window reported as about 24 hours. A self-hosted Gotenberg on a small VPS or pay-per-use serverless container can convert thousands of documents a month at very low cost, but it adds operations work. CodeSandbox SDK runs real microVMs (any language, servers, Docker); its free SDK tier is limited (about 10 concurrent VMs and 20 new sandboxes per hour), its paid Scale tier starts at about 170 USD per month per workspace, and VM time is billed in credits (published figures conflict, 0.015 per credit and 0.15 per hour). Do not buy an expensive plan before the free tier proves the feature is used.

---

## C2. The broker worker (extends the OAuth worker, never touches file bytes)

Vendor API keys must stay secret, so they live in the Cloudflare Worker (as Worker secrets). The worker is a **job broker and key vault**, not a file proxy.

Endpoints (all CORS-locked to the app origin):
- `POST /render/office/start` body `{ size, mime, nameHash }` after verifying a Cloudflare Turnstile token and the quota (C3). The worker creates the vendor job and returns `{ jobId, uploadUrl, uploadFields }` using the vendor's direct-upload mechanism (a signed URL or form).
- The browser uploads the file bytes **directly to the vendor**.
- `GET /render/office/status/:jobId` returns state and, when done, a short-lived signed URL to the resulting PDF. The browser downloads the PDF directly from the vendor, caches it in OPFS keyed by source version, and shows it in the PDF viewer.
- `DELETE /render/office/:jobId` asks the vendor to delete the job and its files as soon as the PDF is downloaded.
- `POST /render/sandbox/start` and `DELETE /render/sandbox/:id` for Tier E (C5).
- `GET /render/capabilities` returns which tiers are enabled and the remaining daily budget as a coarse flag (available or not), never exact spend.

The worker must never receive file contents or the user's provider tokens. If a vendor cannot support direct browser upload, that vendor is not allowed as a Tier P adapter.

Adapter interface in `worker/src/vendors/`: `RenderVendor { start(meta), status(id), cancel(id), limits }` with one implementation per vendor and a mock for tests. Swapping vendors must not change the app.

---

## C3. Abuse and cost controls (mandatory)

Without accounts, anyone could drive up the owner's bill. Required controls, all enforced in the worker:
- Cloudflare Turnstile token required on every `start` call.
- Per-IP and per-day limits (store only counters keyed by a salted hash of the IP, with a 24 hour expiry; no file names, no content).
- A global daily budget ceiling with a hard stop, and a kill switch environment variable that disables every paid tier instantly. When tripped, the app falls back to Tier 1, 2 and 3 and says so plainly.
- Per-file caps: for example 50 MB and a page or sheet limit; reject larger files before any vendor call.
- Per-session caps for Tier E: maximum 15 minutes per sandbox, one sandbox per client at a time, automatic shutdown on tab close, idle timeout, and a watchdog that deletes orphaned sandboxes.
- Alerts: log only aggregate counters; the owner reviews the vendor dashboards.
- Document the monthly cost ceiling in `docs/costs.md` with the numbers above and how to change them.

Optional later: a bring-your-own-key mode where advanced users store their own vendor key locally (encrypted, README 9.5) and call the vendor directly if its API allows browser calls. Not in this release unless trivial.

---

## C4. Privacy and consent

Cloud rendering sends the file to a third party. This is a real change from "your files never leave your browser", so:
- Tier P and E are **off by default** and appear only as an explicit choice ("Render in the cloud") with a consent dialog naming the vendor: "This sends the file to <vendor> to convert it to PDF. They delete it after about <retention>. Shelf does not store it."
- Consent is per file for private repositories. A per-repository "always allow" checkbox is allowed, never pre-ticked, and never offered for files that trigger the sensitive-name guard (8.7): those require a fresh confirmation every time.
- Public repository files may use a per-session "allow" instead.
- The Privacy screen lists each vendor, what is sent, what is retained, and links to the vendor policy. Update `docs/privacy.md` and the Google and Microsoft consent-screen text accordingly.
- The network allowlist (9.3) gains the vendor hosts used by direct upload and download, and each is documented.
- The neutral secondary button is used for the send action, never the green primary.

---

## C5. Tier E cloud sandbox for projects that need a server

- Public repositories first: the worker asks the vendor to create a sandbox from the repository URL, runs the install and start commands detected from the project, and returns a preview URL that the app embeds in a sandboxed iframe on a vendor domain (never on the app or sandbox origin).
- Private repositories are an **open question for the spike**: passing a token to a vendor is not allowed (README 9.5). The only acceptable approach is to upload file contents into the sandbox through a vendor-supported signed channel from the browser. If that is not possible, Tier E is public-repositories-only and the UI says so.
- Always show the untrusted-preview banner, a visible countdown to automatic shutdown, a Stop button, a console panel, and the cost-safety notice "Sessions end after 15 minutes."
- Prefer Tier A, B or D when they suffice: the UI should only suggest Tier E when a project clearly needs a server (database config, non-Node runtime, Docker files).

---

## C6. Milestone changes

- **M3.5** builds: the vendor-neutral interfaces, the mock vendors, the consent dialogs, the Tier P and Tier E UI (disabled unless the worker reports the tier enabled), cost-control logic in the worker against mocks, and the e2e tests with the mock vendor. It does **not** create real vendor accounts.
- **M6** wires the real worker endpoints, Turnstile, quotas and the first real vendor adapters (CloudConvert, CodeSandbox) once the owner has created the accounts.
- **[HUMAN] steps** to add to `SETUP.md`: create a CloudConvert account and API key (use the free tier first), create a CodeSandbox account and SDK key (free tier first), create a Cloudflare Turnstile site key, set Worker secrets and the budget variables, set billing alerts at each vendor.

### Acceptance criteria (add to section 15)

36. With the mock vendor enabled, a DOCX, PPTX and XLSX can be rendered in the cloud, the PDF opens in the PDF viewer, and a second open is served from OPFS.
37. The worker never receives file bytes or provider tokens (e2e test inspects all worker requests).
38. With the kill switch on or the daily budget exhausted, Tier P and E disappear or show a clear unavailable message, and lower tiers still work.
39. A file over the size cap is rejected before any vendor call.
40. A file with a sensitive name always asks for fresh confirmation before any cloud send.
41. A Tier E sandbox for a public repo shows a countdown, stops at 15 minutes, and is deleted on tab close or by the watchdog (verified against the mock).
42. `docs/costs.md` states the monthly ceiling, how it is enforced, and where to change it.
