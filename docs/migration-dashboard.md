# UI migration dashboard

Tracks the Artemis client migration from Bootstrap, ng-bootstrap and PrimeNG to Tailwind and
the TUM UI kit (`@tumaet/ui-angular`). Every number is derived from Artemis's own definition of
the migration, not from a separate heuristic.

## What Artemis defines, and what we reuse

Artemis's [client guideline](https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/guidelines/client-development.mdx)
(section _Styling_) defines the migration in three artifacts that its own
`rules/migration-source-coverage.spec.mjs` keeps consistent:

| Artifact                                                    | Meaning                                                    | Used for                             |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| `rules/no-bootstrap-classes.mjs`                            | The matcher for Bootstrap-only class tokens                | Hits (imported from the analyzed commit) |
| `eslint.config.mjs`, lock block enabling that rule          | Paths that are done; Bootstrap must not return             | Locked units, lock-list changes      |
| `.stylelintrc.json` hex/`--bs-` override                    | SCSS residue that a locked path must not contain           | Style hits                           |
| `src/main/webapp/tailwind.css` `@source` list               | Paths whose Tailwind utilities are generated               | `scanned` flag per unit              |
| `supporting_scripts/migration/migrate.mjs`                  | `status` (burndown per section) and `check` (ready to lock)| Parity target for hits and lockable  |

`migrate.mjs status` and this analyzer agree on template hits to within the forms the
Artemis script scans with regular expressions (it counts commented-out markup; the analyzer
parses templates with `@angular/compiler`).

## Definitions

- **Hit** — a class token for which `isBanned(token)` of the analyzed commit's rule is true,
  found in an external or inline template (static `class`, `styleClass`, `*StyleClass`,
  `[class.x]`, string literals and unquoted keys inside `[class]`/`[ngClass]` bindings via
  the rule's `bannedClassesInBindingExpression`, plus the static parts of interpolated class
  lists, which the lint cannot see) or in TypeScript class strings (`@HostBinding('class.x')`,
  `host: { '[class.x]' }`, `addClass(...)`/`classList.add(...)` arguments, string literals
  assigned to names matching `/class/i`). In SCSS a hit is `var(--bs-*)`, a hex color,
  `rgb()`/`hsl()` or a Bootstrap Sass import, with comments removed.
- **Unit** — an Angular component or directive: the TypeScript file plus its `templateUrl`
  and `styleUrl(s)`. A structural directive's implicit template is counted once. Files that
  no unit owns (shared partials, helpers, `content/scss`) are reported per section but are not
  units. Style hits are counted once per file in totals; a shared stylesheet counts for every
  unit that references it in that unit's own row.
- **Status** — `locked` when the template path (or the `.html` sibling of a directive or
  inline-template component) matches a lock glob; otherwise `dirty` when the unit has hits,
  `clean` when it has none. Hits inside locked units are reported as _locked residue_: they
  exist outside what the lint gate scans.
- **Rendered / closure** — units reachable through relative or `app/` imports, including
  `import()` calls, so template children, dialogs opened from code and lazily loaded routes
  are included. Content projected from outside a unit and selector-only references are not.
- **Blocks** — for a unit with hits, the number of units without hits whose closure contains it.
- **Lockable** — a directory under `src/main/webapp/app` that is not locked, contains at
  least one unlocked unit, and in which every unit and orphan file has zero hits and zero
  closure hits. Only maximal directories are listed, with the three entries to add.
- **Section** — the first directory below `src/main/webapp/app`; `content` for global styles.

## Data

`public/migrations/index.json` holds a summary for the kit-pilot baseline, weekly samples
until package adoption, and every first-parent commit since (`totals` only, with the commit
subject so changes are attributable to pull requests). `public/migrations/<sha>.json` holds the
full detail (units, sections, orphan files, inventories, lockable directories, kit selectors,
diagnostics, rule blob hash) for weekly checkpoints, both milestones and the latest commit;
older detail files are deleted. Schemas live in `src/features/migrations/model.ts`, and the
generator refuses cached detail whose unit, dirty or lockable counts disagree with the manifest.

The analyzer executes the rule module of the analyzed commit (`git archive`, no checkout).
That is code from the Artemis repository running in the collection workflow; the rule is
dependency-free today and the import fails loudly if it stops exporting the matcher.

## Dashboard

One page, state in the URL (`snapshot`, `compare`, `section`): headline tiles with sparklines,
a step-area burndown of hits for every integrated commit with lock-list changes marked,
the commits that moved the numbers between the two selected checkpoints, a sections table
opening a side sheet (units, blockers, lockable directories with copyable lock entries),
shared units ranked by how many clean units they block, and inventories of remaining
Bootstrap classes, PrimeNG, ng-bootstrap and TUM UI usage with the guideline's targets.
Regressions (hits increased, new dirty units, locked residue) appear only when present.

## Develop, verify, regenerate

```sh
npm ci
npm run lint && npm run format:check && npm run typecheck:report
npm test                      # analyzer fixture, generator against a temporary git history
npm run build
npx playwright install chromium firefox && npm run test:e2e
git submodule update --init artemis
npm run report:ui             # incremental; --rebuild after changing the analyzer
```

## Collection and publication

- Hourly at minute 17 (`.github/workflows/daily-report.yml`), plus manual dispatch and an
  optional `repository_dispatch` event `artemis-updated`. The collector fetches
  `origin/develop`, analyzes every missing first-parent commit, runs the tests, commits the
  submodule pin and reports with `GITHUB_TOKEN`, then verifies, builds and deploys that exact
  commit to Pages through the reusable verification workflow. No PAT is required.
- Unchanged runs create no commit but still verify and deploy, which retries a failed
  deployment. Concurrent `main` updates reject the push; the next run catches up. A remote-HEAD
  guard skips deployments overtaken by a newer default-branch revision and fails closed when
  the lookup fails.
- GitHub may delay or drop scheduled runs; `generatedAt` is the analysis time, not the last
  successful check. See the
  [collection runs](https://github.com/ls1intum/Artemis-CodeStats/actions/workflows/daily-report.yml).
- After merging workflow changes, dispatch the collector once and confirm the published SHA
  flows through verification and Pages, then rerun it unchanged to exercise the
  no-empty-commit path. PR CI cannot exercise the write-enabled path.

References: [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[token-trigger restrictions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow),
[reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
