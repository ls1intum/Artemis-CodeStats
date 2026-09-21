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
  lists, which the lint cannot see) or in the deterministic TypeScript forms
  (`@HostBinding('class.x')`, `host: { class, '[class.x]' }`, `addClass(...)` and
  `classList.add(...)` literals). Class strings assembled elsewhere in TypeScript (enum
  members, signals, method returns) are not counted; neither Artemis gate sees them either.
  In SCSS a hit is `var(--bs-*)`, a hex color, `rgb()`/`hsl()` or a Bootstrap Sass import,
  with comments removed.
- **Unit** — one `@Component` or `@Directive` declaration: its `templateUrl`, `styleUrl(s)`
  and, for the first declaration in a file, the file's TypeScript hits. Further declarations
  in the same file get ids `path#1`, `path#2`. A structural directive's implicit template is
  counted once. Files that no unit owns (shared partials, helpers, `content/scss`) are reported
  per section but are not units. Totals and sections count every file once; a template or
  stylesheet shared by several units appears in each unit's own row (marked as shared).
- **Status** — `locked` when the template path (or the `.html` sibling of a directive or
  inline-template component) matches a lock glob; otherwise `dirty` when the unit has hits,
  `clean` when it has none. Hits inside locked units are reported as _locked residue_: they
  exist outside what the lint gate scans.
- **Imports with hits / closure** — units whose decorated class this unit imports by name
  (relative or `app/` specifiers, `import()` calls), transitively: standalone `imports`,
  dialogs opened from code and lazy loads. Type-only imports and imports of other symbols
  from a unit's file (enums, constants) are not edges. Route files are not units, so pages
  loaded through a route file are not connected to it. Content projection from outside a
  unit is not resolved.
- **Blocks** — for a unit with hits, the number of Bootstrap-free, unlocked units whose
  closure contains it.
- **Lockable** — a directory under `src/main/webapp/app` that is not locked, contains at
  least one unlocked unit and at least one external template, and in which every unit and
  orphan file has zero hits and zero closure hits. Only maximal directories are listed, with
  the three entries to add.
- **Section** — the first directory below `src/main/webapp/app`; `app` for root files and
  `content` for global styles.
- **Page** — a unit referenced by `component` or `loadComponent` in a `*.routes.ts` /
  `*.route.ts` file, with the `path` of that route definition (the shortest when several).
  A page is _ready_ when it and everything it imports have zero hits, _blocked_ when only
  imported units have hits.
- **Spacing** — Bootstrap spacing-scale classes (`m*-0..5`, `p*-0..5`, `gap-0..5`) per unit.
  The rule allows them because Tailwind has the same names, but their values change once a
  directory is locked, so they are listed as work in the brief, not as hits.
- **Tailwind** — a unit whose template uses utilities that exist only in Tailwind
  (`flex-col`, `items-center`, `grid-cols-*`, `text-state-*`, …). Evidence of the target style
  being used, never proof of completion.
- **Stylesheets** — every SCSS file with residue, split into `--bs-*` variables, raw colors
  (hex, `rgb()`, `hsl()`) and Bootstrap Sass imports, with the number of units that reference
  it. Theme palette files under `content/scss/themes` define the palette itself and appear
  under the `content` section.
- **Inventories** — PrimeNG, ng-bootstrap and TUM UI usage is counted from template elements
  and attributes (kit selectors are read from the kit sources of the same commit), plus PrimeNG
  and ng-bootstrap imports whose names end in `Service` or `Modal`, which are usage without
  template evidence. Other imports may be types and are not counted.

## Data

`public/migrations/index.json` holds a summary for the kit-pilot baseline, weekly samples
until package adoption, and every first-parent commit since (`totals`, compact per-section
rows and the commit subject so changes are attributable to pull requests). `public/migrations/<sha>.json` holds the
full detail (units, sections, orphan files, inventories, lockable directories, kit selectors,
diagnostics, rule blob hash) for weekly checkpoints, both milestones and the latest commit;
older detail files are deleted. Schemas live in `src/features/migrations/model.ts`, and the
generator refuses cached detail whose unit, dirty or lockable counts disagree with the manifest.

The analyzer executes the rule module of the analyzed commit (`git archive`, no checkout).
That is code from the Artemis repository running in the collection workflow; the rule is
dependency-free today and the import fails loudly if it stops exporting the matcher.

## Dashboard

State lives in the hash query (`view`, `snapshot`, `compare`, `section`; the comparison is
always an earlier checkpoint). Headline tiles and the locked / clean / Bootstrap bar are always
visible; the views are:

| View       | Content                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Overview   | Units whose hits grew (only when any), step-area burndown per commit with lock-list changes, commits that moved the numbers with PR links |
| Sections   | Sections table with status bar, Δ, per-section trend sparkline, pages ready; heatmap of hits per section × class family; side sheet per section with units, imported units with hits, shared stylesheets, lockable directories and a section brief |
| Pages      | Routed pages ready / blocked / Bootstrap per section, and every page sorted by remaining work                |
| Next steps | Brief for people and agents (copy as markdown, download JSON), lockable directories with copyable lock entries, shared units that block the most |
| Inventory  | Remaining Bootstrap classes with guideline targets, PrimeNG with kit equivalents, ng-bootstrap, TUM UI kit usage and unused selectors, stylesheets with residue |
| History    | Checkpoint table with detail downloads, and the agent entry points                                          |

## For agents and scripts

Static files, regenerated hourly, are the integration surface; no server or MCP endpoint is
needed to read them ([a JSON file is often the better MCP server](https://materializedview.io/p/mcp-server-could-have-been-json-file)).

- `llms.txt` at the site root indexes the entry points ([llms.txt convention](https://llmstxt.org/)).
- `migrations/brief.md` — status, directories to lock with the exact three entries, shared
  units to fix first, and per-section unit tasks with each Bootstrap class mapped to the
  guideline target, PrimeNG mapped to kit selectors, stylesheet residue and spacing work.
  Written so a coding agent can start migrating from it. `migrations/brief.json` is the same
  content as data and names the detail file it was built from. The dashboard renders the same
  brief for any snapshot or section (copy / download).
- `migrations/index.json` and `migrations/<sha>.json` — the full data; schemas in
  `src/features/migrations/model.ts`.

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
