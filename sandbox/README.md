# Sandbox deployment

This is an independent static Vite project. It contains no provider adapter, token, app storage or backend. The bootstrap transfers a private MessagePort to the service worker and replaces itself with a virtual repository document. Never deploy these files on the Shelf origin or share cookies with Shelf.

Local: run `npm run dev` at port 5173 and `npm run sandbox:dev` at port 5174. Set `VITE_SANDBOX_ORIGIN=http://127.0.0.1:5174` for the app. Use 127.0.0.1 consistently. Browser tests build both origins and run at 4173/4174.

[HUMAN] Create a second Cloudflare Pages project. Set build command `npm ci && npm run sandbox:build`, output directory `sandbox/dist`, and `SHELF_APP_ORIGIN` to the exact HTTPS Shelf origin, without a trailing slash. Deploy to a different registrable domain. Separate Pages project subdomains rely on the public suffix boundary for pages.dev; verify that boundary and actual cookie behavior before production. Never use sibling custom subdomains of one registrable domain.

The build generates `sandbox/dist/_headers`, including exact frame-ancestors, COOP and COEP. Deploy the generated directory with its headers. Configure `VITE_SANDBOX_ORIGIN` when building Shelf and verify its CSP. Test the deployed origin pair and a disallowed embedding origin before enabling preview. No secrets are required in this project.

Strict mode blocks external resources. Optional external mode permits HTTPS with credentials omitted in intercepted fetches. COEP may reject third-party resources without CORS or CORP. Workers, forms, popups and child frames remain blocked. Stop closes the private port, aborts app reads and clears the worker session. Diagnostics are bounded, advisory output from untrusted code, never commands.
