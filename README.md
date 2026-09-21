# Artemis CodeStats

An evidence-based migration observatory for the [Artemis learning platform](https://github.com/ls1intum/Artemis).

**[Open the dashboard](https://ls1intum.github.io/Artemis-CodeStats/)** ·
[Architecture, grading rubric, research and A+ roadmap](docs/migration-dashboard.md)

## Active: UI modernization

Track TUM UI and Tailwind adoption independently from removal of PrimeNG, ng-bootstrap,
Bootstrap classes and legacy style tokens. Explore real history, module footprints and
source-line evidence with shareable filters. No invented overall completion score.

Initialized from the [owned-kit pilot on July 17, 2026](https://github.com/ls1intum/Artemis/pull/13226),
including the exact [internal-package adoption on August 4](https://github.com/ls1intum/Artemis/pull/13323).
Signals/decoratorless API and DTO dashboards remain under **Archived migrations**, with
historical reports preserved. Their scheduled collection has stopped; archival does not
claim they are 100% complete.

## Develop and verify

Requires Node 24 and npm. The UI uses committed report artifacts; no Artemis server is needed.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck:report
npm test
npm run build
npx playwright install chromium firefox
npm run test:e2e -- --workers=2
```

Build/dev preparation derives compact summaries of all historical DTO reports; full details
load only for the selected snapshot. No archive history is discarded.

`npm run test:e2e` serves the production build at
`http://127.0.0.1:4173/Artemis-CodeStats/`. Run the build first.

## Refresh reports

```sh
git submodule update --init artemis
npm run report:ui
# Required after changing detector semantics:
npm run report:ui -- --rebuild
```

The analyzer reads the **pinned** Artemis Git revision without checking out historical
commits or changing the working tree. Reports contain full commit provenance and
versioned schemas. Weekly first-parent samples plus the two adoption milestones and
HEAD are published under `public/migrations/`.

The daily workflow updates the submodule to `origin/develop`, generates and validates
reports, and commits both the source pin and evidence. Configure `GH_PAT` with repository
contents-write permission so report commits trigger the Pages deployment workflow.

The old `npm run report`, `npm run report:dto` and their historical data remain available
for manual archival research; they are no longer part of the scheduled UI pipeline.

## Interpret responsibly

Counts are distinct affected files, not component instances. Dimensions overlap; the
legacy-file total is deduplicated. Tailwind evidence is intentionally conservative,
shared Bootstrap/Tailwind spacing names are not guessed, and no source detector can
certify visual parity or accessibility. See the [coverage contract and runbook](docs/migration-dashboard.md).

Built with React, TypeScript, Vite, Tailwind, TanStack Router, Recharts and Zod. The report
pipeline uses TypeScript and Angular parsers. This dashboard measures Artemis's Angular
UI kit; it does not depend on that kit to render its own React UI.
