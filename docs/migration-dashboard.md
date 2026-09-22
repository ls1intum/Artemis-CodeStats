# Client UI modernization dashboard

Tracks the Artemis client migration from Bootstrap, ng-bootstrap and PrimeNG to Tailwind and
the TUM UI kit (`@tumaet/ui-angular`). Bootstrap is measured with Artemis's own definition of the
migration (lint rule, lock list); PrimeNG, ng-bootstrap and TUM UI by what each unit uses and
imports, matched against the kit's selectors at the same commit.

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
- **Stage** — `legacy-free` when a unit has no Bootstrap hits and uses neither PrimeNG nor
  ng-bootstrap; `PrimeNG or ng-bootstrap remain` when it is Bootstrap-free but uses one of them;
  `Bootstrap` otherwise. `totals.legacyFree` and the per-section rows carry the counts.
- **Kit component** — the TUM UI selector that covers a PrimeNG usage (`p-dialog` →
  `tum-ui-dialog`, `pTooltip` → `tumUiTooltip`) or an ng-bootstrap usage (`ngbTooltip` →
  `tumUiTooltip`, `NgbModal` → `tum-ui-dialog`, `ngbDropdown` → `tum-ui-menu`, …), only when the
  kit of the same commit ships that selector. Usages without one are kit gaps.
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
  closure contains it. `blockers` lists the imported units with hits for every unit.
- **Lockable** — a directory under `src/main/webapp/app` that is not locked, contains at
  least one unlocked unit and at least one external template, and in which every unit and
  orphan file has zero hits and zero closure hits. Only maximal directories are listed, with
  the three entries to add.
- **Section** — the first directory below `src/main/webapp/app`; `app` for root files and
  `content` for global styles.
- **Page** — a unit reached from `app.routes.ts` through `component`, `loadComponent`,
  `children` (inline or a same-file array) and `loadChildren`, with its full path joined from
  the parents (`:dynamic` marks a segment that is not a string literal; named outlets are
  skipped). A page is _ready_ when it, everything it imports and the route components it
  renders inside (`routeParents`) have zero hits, _blocked_ when only those have hits, and
  _legacy-free_ when additionally none of them use PrimeNG or ng-bootstrap. The global shell (`app.component` with navbar, footer and overlays) renders on every page and
  is reported separately rather than blocking every page.
- **Spacing** — Bootstrap spacing-scale classes (`m*-0..5`, `p*-0..5`, `gap-0..5`) per unit.
  The rule allows them because Tailwind has the same names, but their values change once a
  directory is locked, so they are shown per unit as remaining work, not as hits.
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

`public/migrations/index.json` holds a summary (totals, compact per-section rows, commit
subject) for the kit-pilot baseline, weekly samples until package adoption, and every
first-parent commit since. `public/migrations/<sha>.json` exists for every one of those
commits: weekly commits and the two milestones (`bases` in the manifest) hold the full detail
(units, routed pages, blockers, stylesheets, lockable directories, kit selectors, diagnostics,
rule blob hash); every other commit holds a patch against the base before it (units and
stylesheets that changed or disappeared, plus the small top-level fields in full). The client
resolves a patch through its base with one extra request, so any commit can be selected as
the snapshot or the comparison with full detail. Stored units carry only their own facts
(hits, classes, library usage, imported units, route); import closures, blockers and route
hits are derived on load, so a unit changes only when its own files change. Paths are
relative to `src/main/webapp/`. Bases are about 0.7 MB, patches about 50 KB on average
(median 40 KB); 407 commits take 28 MB. Schemas and `applyPatch` / `makePatch` live in
`src/features/migrations/model.ts`; the generator refuses a cached detail whose unit, dirty or
lockable counts disagree with the manifest.

The analyzer executes the rule module of the analyzed commit (`git archive`, no checkout).
That is code from the Artemis repository running in the collection workflow; the rule is
dependency-free today and the import fails loudly if it stops exporting the matcher.

## Dashboard

State lives in the hash query (`view`, `snapshot`, `compare`, `section`). Both commit pickers
search every snapshot by date, commit and subject; the comparison is always an earlier commit
and defaults to the last commit at least a week before the snapshot. Headline tiles and the
locked / clean / Bootstrap bar are always visible; the views are:

| View       | Content                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Overview   | Units where legacy grew (only when any); four step-area trends per commit (Bootstrap hits, units using PrimeNG, ng-bootstrap, TUM UI) with lock-list changes; commits that moved the numbers with PR links |
| Sections   | Sections table with stage bar, Δ vs comparison and since adoption, units per library, locked; heatmap of Bootstrap hits per kind of work plus SCSS, PrimeNG and ng-bootstrap occurrences (row-normalised); side sheet per section with units by stage, library usage with kit components, imported units with hits, shared stylesheets and lockable directories |
| Pages      | Routed pages legacy-free / components remain / blocked / Bootstrap per section, the global shell's hits, and every page with its full route sorted by remaining work |
| Next steps | Lockable directories with copyable lock entries, shared units that block the most                           |
| Inventory  | Remaining Bootstrap classes with guideline targets, PrimeNG and ng-bootstrap with kit components and coverage (usages a kit component covers, largest gaps), TUM UI kit usage and unused selectors, stylesheets with residue |

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
