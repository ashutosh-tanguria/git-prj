# AGENTS.md

Read README.md fully before any task. It is the source of truth.
If docs/ANALYSIS.md or PROGRESS.md exist, read them too.
If sections conflict, precedence is: 8 (guards) > 9 (security) > 5 and 6 (UI) > the rest.

## Rules
- Work on one milestone at a time (README section 14). Stop at its exit criteria and report.
- `npm run check` must pass before every commit. Use conventional commit messages.
- Update PROGRESS.md at the end of every task: Status, Decisions, Not done, Manual steps, Known issues.
- No Tailwind, no component kits, no raw colours, gradients, backdrop-filter, or em dashes anywhere.
- No `any` without a reason. No skipped or deleted tests. No mock data in production paths.
- Only contact hosts listed in README 9.3. Never store tokens outside README 9.5.
- If something is ambiguous, choose the simplest safe option, record it in PROGRESS.md, and continue.
- If a task needs a human step (OAuth apps, secrets), build against the mock and list it in PROGRESS.md.
- Do not start the next milestone until the owner says so.
- If README-AMENDMENT-*.md files exist, they override README.md where they conflict. Merge them into README.md before building.