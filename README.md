# Artemis CodeStats

Migration reports for the [Artemis learning platform](https://github.com/ls1intum/Artemis) client.

**[Open the dashboard](https://ls1intum.github.io/Artemis-CodeStats/)** ·
[UI methodology](docs/migration-dashboard.md) ·
[OpenAPI methodology](docs/openapi-dashboard.md)

## Active: client UI modernization

Retiring Bootstrap, ng-bootstrap and PrimeNG from the Artemis client for Tailwind and the TUM AET UI
kit. Bootstrap is measured with Artemis's own `no-bootstrap-classes` lint rule and regression-lock
list; PrimeNG, ng-bootstrap and TUM AET UI by what each unit uses. Every first-parent commit on
`develop` since the [TUM AET UI package adoption on August 4, 2026](https://github.com/ls1intum/Artemis/pull/13323)
is a full snapshot that can be selected and compared (weekly samples back to the
[kit pilot on July 17](https://github.com/ls1intum/Artemis/pull/13226)).
The dashboard shows the trends per dependency, which pull requests moved them, which modules,
pages and shared components block progress, which directories can be locked now, and which
Bootstrap classes, PrimeNG and ng-bootstrap usages remain with the TUM AET UI component that
replaces them, and who moved the migration: a contributor leaderboard credits every
integrated commit to its GitHub author.

The signals/decoratorless and DTO dashboards are archived under **Archived migrations**.
Their data is preserved; their collection has stopped.

## Active: OpenAPI migration

The OpenAPI reporting feature has a [measurement contract, pinned evidence baseline and
server, specification, generated-transport and production-call inventories](docs/openapi-dashboard.md). Run `npm run report:openapi --
--repo /path/to/Artemis --ref <commit> --output /tmp/openapi-report` with Node 24, npm and
a JDK 17+. The retained report is in `public/openapi/`. Direct calls and supported wrapper,
inheritance and adapter chains are assessed, with scoped next steps and readiness prerequisites.
Optional exceptions, verification, enforcement and web-relevance records are configured in
`report/openapi/evidence.json` (or `--evidence <file>`). Missing or stale evidence cannot
establish runtime migration or protection. The active **OpenAPI migration** dashboard at
`/#/openapi` shows all module assessments, endpoint details, cross-area callers, scoped next steps,
and revision-bound evidence. Module, view, endpoint and snapshot selections can be shared in the URL.

## Develop and verify

Requires Node 24, npm and a JDK 17+ for report tests/collection. The UI reads committed report
artifacts; local viewing needs no Artemis server, generator checkout or GitHub token.

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
artemis_revision=$(git rev-parse HEAD:artemis)
npm run report:ui -- --ref "$artemis_revision"
npm run report:openapi -- --ref "$artemis_revision"
npm run report:openapi:verify # isolated rebuild, history validation and matching UI revision
```

Collectors read committed Artemis trees with `git archive` and never change the source
working tree. UI collection is incremental; use `--rebuild` after changing its analyzer.
OpenAPI fingerprints invalidate stale inputs automatically; `--rebuild` forces extraction.
Both collectors accept `--repo`, `--ref` and `--output` for isolated reproduction; see the
[OpenAPI collection instructions](docs/openapi-dashboard.md#collection-and-reproduction).
The workflow checks `origin/develop` hourly, collects both reports at one SHA, commits validated reports with
`GITHUB_TOKEN`, and deploys that exact commit to Pages; see
[collection runs](https://github.com/ls1intum/Artemis-CodeStats/actions/workflows/daily-report.yml)
and the [collection notes](docs/migration-dashboard.md#collection-and-publication).

Built with React, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Router, Recharts and Zod.
The report pipeline uses the TypeScript and Angular compilers.
