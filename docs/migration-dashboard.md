# Migration dashboard: architecture, audit and release criteria

This React/Vite application measures a **pinned Artemis Git submodule**. It does not
migrate or deploy Artemis. Signals and DTO dashboards remain archives; UI modernization
is the active route. Archival is a prioritization decision, not a completion certificate.

## Baselines and metric contract

History starts at the [owned-kit pilot, #13226](https://github.com/ls1intum/Artemis/pull/13226)
(July 17, `e6e7c9cca1e961ce05463177bc316dc42c8d1c38`) and includes the exact
[workspace-package adoption, #13323](https://github.com/ls1intum/Artemis/pull/13323)
(August 4, `45bcba707254de4ccee7bb4c83526fbdfa45c6fc`). Weekly first-parent samples
plus both milestones and HEAD are retained. Intermediate regressions can be missed.

Each dimension counts **distinct affected files**; `legacyFiles` is their deduplicated
legacy union. Never sum dimensions or treat modern and legacy files as disjoint.
Reduction is `(baseline-current)/baseline`; zero baseline is undefined. Negative values
are regressions. Deletion, splitting and moves affect counts without proving migration.

| Dimension | Evidence | Limit |
|---|---|---|
| PrimeNG | Package imports/re-exports, `p-*` elements, curated directives | No transitive wrapper resolution |
| ng-bootstrap | Package imports, `ngb-*` elements, `ngbX` directives | Dependency evidence, not runtime usage |
| Bootstrap | Whole class tokens matching pinned Artemis policy; stylesheet imports | Shared names such as `p-3` deliberately excluded |
| Legacy tokens | `--bs-*` / `--p-*` style references and bindings | Not computed-theme correctness |
| TUM UI | Historical/packaged imports, elements and directives | Kit implementation itself excluded |
| Tailwind evidence | Conservative distinctive whole utilities and variants | Not exhaustive usage or a completion denominator |

Scope: production TS/HTML/CSS/SCSS in application/global-content sources; no specs,
stories, declarations or owned-kit implementation. TypeScript and Angular parsers handle
imports, external templates and literal inline `@Component` templates. Class conditions
and function arguments are not treated as rendered classes. Computed templates, dynamic
class construction, decorator re-exports and wrappers remain unresolved. Stylesheet
scanning is token-based; inline-string source lines may be approximate. Parse diagnostics
are visible. Fixture coverage is **not detector precision/recall**.

## Boundaries and reuse decisions

| Location | Responsibility |
|---|---|
| `report/ui/analyze.ts`, `bootstrap.ts` | Source analysis and pinned upstream class policy |
| `report/ui/index.ts` | Read Git archives without checkout mutation; validate/cache/publish reports |
| `src/features/migrations/model.ts` | Zod contracts, cross-field invariants, dimension vocabulary |
| `load-report.ts`, `src/lib/router.tsx` | Router loading, cancellation, cache keys and errors |
| Feature components | Metrics, time-scaled charts, module table, evidence and methodology |
| `public/migrations/` | Summary manifest and selected-snapshot evidence |
| `report/prepare-dto-archive.ts`, `src/lib/dto-data.ts` | All DTO summaries plus on-demand original JSON assets |

The router's `loaderDeps` includes source selection, not display filters. Filtering does
not refetch evidence. Static snapshots remain fresh in the router cache until invalidation,
reload or cache eviction; retry uses router invalidation. HTTP fetches revalidate cached
report bytes so retry can recover from a deployment-version mismatch. Manifest failures use the route
error component; evidence failures preserve the summary. No custom fetch-state hook,
query cache, backend or plugin architecture is needed.

Use existing Button/Input/Label/Alert and Radix Popover for interactive primitives.
Retain native select/details/table where they already provide the needed semantics.
The local Table component always adds an overflow wrapper, so using it inside named,
keyboard-scrollable regions would add redundant scroll containers. Card adds a div without
improving the existing named section. Direct Recharts primitives are library usage, not a
custom chart engine. Both chart groups use elapsed-time axes, distinguish series with
patterns, and have equivalent six-dimension tabular data.

The generator writes detail files, then atomically replaces the manifest; this is **not a
whole-directory transaction**. CI failure prevents publication. Both manifest and detail
require the same analyzer version; bump it and rebuild all history when semantics change.
Cache reuse reconciles detail evidence with global/module counts. Unreferenced rolling-HEAD
files are pruned. `generatedAt` stays unchanged for an unchanged analysis.

All 875 DTO snapshots remain available. Build/dev preparation derives summaries; Vite URL
imports emit original detail JSON as assets. Only selected details are fetched through a
route loader. No history was truncated to improve the bundle. Historical source links use
the selected commit rather than the moving `develop` branch.

## Audit loops and concrete results

The previous **82.5/100** assessment is superseded: it gave too much credit for test
coverage and declared architecture without sufficiently adversarial checks.

| Loop | Reproducible problem | Change / verification |
|---|---|---|
| 1: correctness | `hover:btn` split into Bootstrap; `'btn'` in conditions/function arguments counted as applied classes | Whole-token and AST-result traversal; focused regression fixtures |
| 1: missing evidence | Class inputs, `pButtonIcon`/`pButtonLabel`, CSS custom-property bindings omitted | Match actual pinned Artemis conventions and rebuild history |
| 1: contracts | Shape-valid cache could contradict counts; detail had no analyzer identity | Cross-field Zod checks, global/module evidence reconciliation, versioned details |
| 1: UI | Unequal time intervals rendered equally; no modern-adoption trend; color-only series | Numeric time axis, separate adoption plot, dash patterns and complete table |
| 1: integration | Custom fetch lifecycle and dropdown dismissal duplicated framework behavior | Router loaders and existing Radix Popover; shared controls |
| 2: scope | Every TS `template` property counted as Angular, including two unrelated response objects in pinned Artemis | Only imported Angular Component metadata; alias/namespace fixtures |
| 2: navigation | Skip link changed hash-router URL; zero deltas displayed growth arrows | Native focus action without navigation; neutral zero/absent states |
| 2: performance | DTO archive embedded ~83.9 MB of JavaScript; Firefox archive checks missed the 5-second assertion deadline | Full summary + selected-detail asset loading; tests pass without larger timeouts |
| 2: evidence | Archived DTO source links pointed to `develop` | Commit-pinned, named source links |
| 2: test theatre | Unasserted screenshots; freshness depended on hardcoded year replacement | Remove screenshots, freeze clock, assert actual rows/focus/requests/recovery |
| 2: maintenance | Duplicate unused `src/app/decoratorless.tsx`; copied obsolete migration comments | Remove dead page and stale prose rather than adding abstractions |

Cross-comparison with Artemis also matters: [focus clipping #13126](https://github.com/ls1intum/Artemis/issues/13126)
and [Tailwind table-layout regression #13193](https://github.com/ls1intum/Artemis/issues/13193)
show why import counts cannot certify usability. [Owned form components #13660](https://github.com/ls1intum/Artemis/pull/13660)
and [account-page migration #13661](https://github.com/ls1intum/Artemis/pull/13661) distinguish
kit capability from application adoption. This dashboard does not claim to close those issues.

## Evidence-based grading rubric

No source provides a “perfect” universal numeric rubric. These weights are explicit project
priorities; the anchors and evidence requirements prevent rewarding volume or confidence.

**0:** absent/unusable. **1:** known incorrect or materially unsafe. **2:** works on happy
paths with important gaps. **3:** documented scope, adversarial regression coverage and
verified representative behavior. **4:** all criterion-specific release evidence obtained,
including independent/manual verification where required. No fractional criterion scores.
Weighted score = sum(weight × rating / 4). A+ ≥95, A ≥90, B ≥80, C ≥70; below 70 not ready.
A+ also requires independent accuracy sampling, manual accessibility checks and verified
remote publication; arithmetic alone cannot waive those gates.
Known corrupted progress, data loss, inaccessible sole data representation or failing release
checks block release regardless of the total. More tests/LOC/comments do not earn points.

| Criterion | Weight | Pre-audit | After fixes | Evidence needed for 4 |
|---|---:|---:|---:|---|
| Metric truth and scope | 25 | 1 | 3 | Independently labeled Artemis corpus; measured false-positive/negative rates |
| Idiomatic integration | 20 | 2 | 4 | Framework lifecycle, existing primitives, appropriate native semantics, no duplicate implementation |
| Accessible visualization / UX | 15 | 2 | 3 | Manual screen-reader/zoom/user-task checks as well as browser/axe tests |
| Meaningful verification | 20 | 2 | 3 | All required browser/producer/recovery paths, including independently exercised remote publication |
| Operational security | 10 | 2 | 3 | Real scheduled/Pages run; token scope/expiry and branch protections verified |
| Maintenance / performance | 10 | 1 | 3 | Low-end profile and explicit budgets; remaining signals archive bulk-load addressed |
| **Total** | **100** | **41.25** | **80 (B)** | **Not A+** |

The lower revised score is intentional: the rubric is stricter than the previous self-assessment.
These are engineering assessments, not measured user-study outcomes or a security certification.

### Visualization decisions

| Candidate | Strict assessment | Decision |
|---|---|---|
| Independent count/delta cards | 3/4; truthful units and undefined baseline, user-task validation pending | Keep |
| Time-scaled legacy/adoption trends + table | 3/4; exact time intervals and non-color identification, manual AT pending | Keep |
| Module footprint matrix + source evidence | 3/4; actionable navigation, no added/resolved/moved classification yet | Keep |
| Blended progress gauge / 100% stacked chart | 1/4; overlapping/incomparable denominators | Reject |
| Personal rankings / promised completion date | 1/4; authorship and net counts do not establish effort or stable throughput | Reject |
| Treemap / radar chart | 2/4 proposal, not implemented or user-validated | Defer; no demonstrated advantage over table/search |

**Bridge to A+ is evidence, not another cosmetic loop:** independently label detector cases;
add reviewed new/resolved/moved comparisons and component-capability mapping; test real Artemis
flows in light/dark and relevant roles; run manual AT/zoom/task studies; exercise scheduled
publication and failed-run recovery; profile low-end devices and set budgets. Do not label
unperformed work “verified” or infer Artemis feature parity from dashboard tests.

## Primary sources and how they constrain the design

- [React: fetching in Effects](https://react.dev/reference/react/useEffect#fetching-data-with-effects):
  prefer framework data loading over manual lifecycle/race/cache handling.
- [TanStack Router data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
  and [search parameters](https://tanstack.com/router/latest/docs/framework/react/guide/search-params):
  explicit dependencies, cancellation, caching and validated URL state.
- [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover): managed focus/dismissal.
- [W3C: no ARIA is better than bad ARIA](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/),
  [non-color identification](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), and
  [complex images](https://www.w3.org/WAI/tutorials/images/complex/): use native semantics and equivalent data.
- [Angular parser](https://angular.dev/api/compiler/parseTemplate),
  [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files),
  [Artemis Bootstrap policy](https://github.com/ls1intum/Artemis/blob/6d7f286184ec6546ba15beac26dd21600a498fba/rules/no-bootstrap-classes.mjs),
  [Artemis class-input policy](https://github.com/ls1intum/Artemis/blob/6d7f286184ec6546ba15beac26dd21600a498fba/rules/no-primeng-component-classes.mjs):
  use parser/policy evidence, not substring counts or guessed runtime behavior.
- [Vite URL assets](https://vite.dev/guide/assets.html#explicit-url-imports): keep bulk report data out of JS.
- [Google code-review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html):
  assess complexity, unnecessary code and test usefulness; comments should explain why.
- [Playwright best practices](https://playwright.dev/docs/best-practices) and
  [accessibility testing](https://playwright.dev/docs/accessibility-testing): observable behavior and isolated tests;
  automated accessibility checks do not replace manual/inclusive testing.
- [GitHub Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions):
  SHA-pinned actions, restricted permissions and credential scope; no implied supply-chain certification.

Primary documents and relevant GitHub issues were searched/retrieved during this audit.
Recommendations above are our application of those sources, not endorsements of our numeric grades.

## Verification and runbook

Requires Node 24, npm; Git/tar and full submodule history only for UI report regeneration.

```sh
npm ci
npm run lint
npm run format:check
npm run typecheck:report
npm test
npm run build
npx playwright install chromium firefox
npm run test:e2e -- --workers=2

git submodule update --init artemis
npm run report:ui                 # pinned source; validate and reuse cache
npm run report:ui -- --rebuild    # recompute every retained sample
```

Build/dev scripts prepare DTO summaries automatically. The daily workflow pins `origin/develop`,
validates reports and builds before committing; it requires a restricted `GH_PAT` to trigger
Pages. Reusable verification produces the artifact consumed by the separate deployment job.
It has not been exercised remotely during this audit.

Local production URL: **http://127.0.0.1:4173/Artemis-CodeStats/** using
`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`.
On this host only, Chromium's `/tmp` restriction requires `TMPDIR=/dev/shm` for browser tests.
No live Jean environment was registered; the test runner starts/stops this preview server.

Verified: 18 detector/data tests; 12 browser scenarios in Chromium and Firefox (24 executions); lint/typecheck/build/format;
workflow actionlint; full 11-snapshot analyzer-v3 rebuild and cache check. Analyzer V8 coverage
is 99.68% lines / 92.16% branches, **not accuracy**. Six existing shared-component Fast Refresh
warnings remain. DTO summary/data JS is ~2.73 MB + ~65 KB UI (formerly ~83.9 MB); selected
original JSON is separate. Initial app JS is ~251 KB gzip. Signals archive still bulk-loads
~12.5 MB uncompressed. No WebKit, manual screen-reader/zoom study, or remote deployment verification.
