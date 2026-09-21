# Artemis CodeStats

Migration reports for the [Artemis learning platform](https://github.com/ls1intum/Artemis) client.

**[Open the dashboard](https://ls1intum.github.io/Artemis-CodeStats/)** ·
[How it is measured](docs/migration-dashboard.md)

## Active: Bootstrap → Tailwind / TUM UI

Remaining Bootstrap in the Artemis client, measured with Artemis's own
`no-bootstrap-classes` lint rule and regression-lock list, for every first-parent commit on
`develop` since the [TUM UI package adoption on August 4, 2026](https://github.com/ls1intum/Artemis/pull/13323)
(weekly samples back to the [kit pilot on July 17](https://github.com/ls1intum/Artemis/pull/13226)).
The dashboard shows the burndown, which pull requests moved it, which sections and shared
components block progress, which directories can be locked now, and which PrimeNG,
ng-bootstrap and Bootstrap APIs remain with their TUM UI targets.

The signals/decoratorless and DTO dashboards are archived under **Archived migrations**.
Their data is preserved; their collection has stopped.

## Develop and verify

Requires Node 24 and npm. The UI reads committed report artifacts; no Artemis server is needed.

```sh
npm ci
npm run dev
npm run lint && npm run format:check && npm run typecheck:report
npm test
npm run build
npx playwright install chromium firefox
npm run test:e2e -- --workers=2
```

`npm run test:e2e` serves the production build at `http://127.0.0.1:4173/Artemis-CodeStats/`.

## Refresh reports

```sh
git submodule update --init artemis
npm run report:ui              # incremental
npm run report:ui -- --rebuild # after changing the analyzer
```

The analyzer reads committed Artemis trees with `git archive` and never changes the submodule
working tree. The workflow checks `origin/develop` hourly, commits validated reports with
`GITHUB_TOKEN`, and deploys that exact commit to Pages; see
[collection runs](https://github.com/ls1intum/Artemis-CodeStats/actions/workflows/daily-report.yml)
and the [collection notes](docs/migration-dashboard.md#collection-and-publication).

Built with React, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Router, Recharts and Zod.
The report pipeline uses the TypeScript and Angular compilers.
