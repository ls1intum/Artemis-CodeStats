# OpenAPI dashboard methodology

The OpenAPI migration dashboard shows specification coverage, generated transport, production
adoption and remaining work across all discovered Artemis modules. These measurements are
independent: available generated code or passing compilation does not establish runtime migration.

## Using the dashboard

Open `/#/openapi`, or `/Artemis-CodeStats/#/openapi` in the deployed site. Local viewing reads
committed JSON from `public/openapi/`; it needs no Artemis server, generator checkout or GitHub token.

The views cover overview metrics, sortable modules, endpoint details, callers, next steps and
evidence. Module, view, operation and snapshot selections are URL-backed, for example:

```text
/#/openapi?module=globalsearch&view=endpoints&operation=GET%20%2Fapi%2Fsearch
```

Module filters follow **server ownership**, retaining callers from other client areas. Shared
unassigned callers remain visible as uncertainty rather than being added to a module's attributed
counts. Source links use the recorded input revision and line. Invalid filters or artifacts offer
recovery controls instead of displaying misleading totals.

Overview compares known operation coverage and detected production call sites in separate charts.
Remaining work is grouped into expandable evidence records; categories can overlap and are not an
estimated task count. Shared limitations appear separately and still constrain module readiness.
Detailed measurement reasons, percentage eligibility and provenance are available in Evidence.

## Measurement definitions

Modules are discovered from the committed server and client trees, including shared infrastructure
and client-only areas. [Module mapping](../report/openapi/module-mapping.json) defines source roots,
role overrides and optional ownership overrides with reasons; feature modules are not a fixed list.
Each discovered scope must have an operation inventory, evidenced no-REST status, or an actionable
analysis limitation. A client-only area's no-REST status does not mean its callers are migrated.

An operation is identified by **uppercase HTTP method plus normalized path**. Class/method paths
are composed; query strings and fragments are excluded. Case, trailing slashes, placeholder names,
path alternatives, handler variants and mapping conditions are preserved. Ambiguous matches are
not resolved arbitrarily.

| Measurement            | Meaning                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Specification coverage | Independent expected server operations classified as present, missing, ambiguous or unresolved in OpenAPI. The specification never defines its own denominator.                            |
| Generated transport    | Actual generated method/path implementations, with symbols and source locations. Observable services and existing GET resource helpers qualify; file counts do not establish availability. |
| Production adoption    | Actual production calls through generated or handwritten transport, including supported adapters and wrappers. Imports and unused injections do not count.                                 |
| Verification           | Separate revision-bound compilation, wire-compatibility and runtime-flow evidence.                                                                                                         |
| Enforcement            | Recorded rule enablement, scope, coverage, exclusions and exceptions. CodeStats reports enforcement; it does not implement Artemis rules.                                                  |

Generated use is `generated-detected` until complete analysis supports `generated-only`. An operation
with both generated and handwritten callers is `mixed`; available generated methods alone do not
make manual usage mixed. `no-calls` requires complete analysis and does not establish migration.

Unique operations and production call sites are counted separately. Several callers can share one
operation; GET and PUT on the same path are different operations. Forwarding implementations remain
chain evidence without duplicating their consumers' call-site counts. Tests, mocks, fixtures and
generated implementations are excluded from adoption. External APIs, assets and WebSockets are
classified separately.

Withheld measurements retain their reason:

- **Unknown:** required evidence is unavailable or insufficient.
- **Unassessed:** the relevant analysis has not been performed.
- **Not applicable:** evidence establishes no meaningful target in the selected scope.
- **Incomplete analysis:** known observations are partial or lower bounds; completeness is unproven.

Unavailable evidence never defaults to zero or success. An evidenced empty scope is not 0% or 100%.

### Web relevance and percentages

A detected production caller or matching explicit metadata establishes **web relevance**. Server-only
status requires supporting evidence. Finding no caller leaves web relevance unassessed.

| Percentage                   | Numerator                                                       | Denominator                                                                                                 |
| ---------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Specification coverage       | Expected operations present in OpenAPI                          | All unique expected server operations, including server-only operations                                     |
| Generated transport coverage | Expected operations with resolved generated transport           | The same independent server inventory                                                                       |
| Production adoption          | Web-relevant operations with exclusive generated production use | All established web-relevant operations, including manual, mixed and intended uses without detected callers |

Percentages require a positive, complete denominator, resolved ownership, matching available inputs
and complete relevant analysis. Ambiguous mappings, unresolved callers and unassessed web relevance
withhold the affected percentage. Unassigned callers can constrain multiple modules; scoped totals
must not be summed into a global denominator. Known counts remain useful when percentages are withheld.

## Extraction strategy and limitations

Collectors read an explicit committed Artemis tree through `git archive` and `git show` in temporary
directories. They do not switch, reset or clean the source checkout; dirty files cannot affect inputs.
The implementation reuses CodeStats's JavaParser/Gson libraries, TypeScript compiler, YAML parser,
Zod schemas, router and shared UI components.

- **Server inventory:** a separate JavaParser pass finds potential Spring mappings independently of
  springdoc. It supports class/method composition, path arrays, explicit methods and resolvable string
  constants. Profiles, conditional controllers and mapping restrictions remain evidence. Parse failures,
  dynamic/constrained paths, custom or inherited mappings and programmatic registration produce
  limitations. Implicit HEAD/OPTIONS and framework/third-party routes are outside this static inventory.
- **Specification:** YAML/JSON parsing checks relevant references and joins method/path identities to
  the independent inventory. Invalid, ambiguous, unavailable or revision-mismatched inputs cannot
  establish absence. Unsupported server URL prefixes or variables require explicit reconciliation.
  This is not a complete OpenAPI semantic validator.
- **Generated transport:** TypeScript analysis indexes actual HTTP implementations and resource
  helpers. Dynamic methods, URLs, mutable bindings and unsupported delegation retain diagnostics.
  Missing output is unknown; metadata-only output does not establish transport availability.
- **Production callers:** syntax/symbol analysis covers import aliases, Angular injection, ordinary URL
  expressions, inherited helpers, stable receiver aliases and supported adapter/wrapper chains.
  Computed dispatch, recursion, multiple terminal branches, mutation and unsupported expressions remain
  unresolved. This bounded analysis does not infer exclusive generated use or absence of calls.

Source inventory describes potential routes, not a proven deployment route set. Profile/package
selection can limit the emitted specification. Runtime activation, wire compatibility and user flows
need separate evidence. Limitations retain source anchors, affected scope and concrete next steps.

## Evidence and readiness

Snapshots record the Artemis commit, schema/analyzer/mapping versions, input SHA-256 hashes,
assumptions and generation/pruning provenance. Storage at one commit does not prove that generated
output came from matching inputs. A declared generator version remains a declaration; recorded
provenance needs a matching generation run and artifact digest. Pruning is observed only with complete
raw and derived specifications from the same evidenced run; otherwise it is unknown.

[Assessment evidence](../report/openapi/evidence.json), selected with `--evidence`, contains optional
exceptions, verification, enforcement and web-relevance metadata. Records require source evidence,
affected scope and an exact Artemis revision/input-hash binding. The collector recomputes applicability;
stale, mismatched or insufficient records cannot establish current success. Evidence documents are
hashed but excluded from their own binding to avoid self-reference.

Exceptions require stable IDs, reasons and **review/removal conditions**. They remain visible and do
not erase manual calls. Verification records identify the check kind and result. Enforcement records
identify the rule, enablement, covered checks, scope, exclusions and exception references.

A migration **candidate** requires complete matching inventory, contracts, transport and exclusive
adoption evidence, resolved web relevance and exception reviews. **Verified** migration additionally
requires current passed wire-compatibility and runtime-flow evidence covering the claimed scope.
**Protected** additionally requires enabled, complete specification/manual-transport enforcement,
including cross-area callers; exclusions and active exceptions prevent that claim. Missing evidence
stays unknown, with explicit prerequisites in Next steps.

Independent [baseline expectations](../report/openapi/fixtures/baseline.json) are pinned to Artemis
`890f92bd9e1d9dd17b254a2fd4759c95d8629c83`. They record exact paths, symbols, source lines, hashes and
uncertainties for calendar use, cross-module search, shared tutorial-registration callers, missing
course specification coverage, missing quiz generated transport and inherited handwritten helpers.
These are source expectations, not fabricated collected results or assumptions about newer revisions.
Consult the [manifest](../public/openapi/index.json) for retained snapshots and their input identity.

Acceptance was audited on **2026-10-11** at Artemis
`1e68e12f48e2992df7ba2fdc3046a025381e5e0b`. The [acceptance expectations](../report/openapi/fixtures/acceptance.json)
reconcile eight source examples and all 39 discovered areas, distinguishing production consumers from
forwarding implementations. Invalid directory/empty-file source anchors were fixed; both retained
OpenAPI reports and all 531 UI snapshots reproduced byte for byte.

The audit passed lint, formatting, report type checking and build. Unit tests: 143 passed, one GitHub
author lookup skipped without a token. Focused browser checks: 32 passed. Full browser suite: 57 passed,
one Firefox clipboard check skipped; archived dashboards also passed with the clock set to 2035.
Generation provenance, pruning, runtime migration and enforcement remain unverified.

## Collection and reproduction

Use **Node 24, npm and a JDK 17+**. Required JavaParser/Gson JARs are tracked in `report/server/lib/`.
Both collectors accept `--repo`, `--ref` and `--output`. Refresh against the committed submodule pin:

```sh
git submodule update --init artemis
artemis_revision=$(git rev-parse HEAD:artemis)
npm run report:ui -- --ref "$artemis_revision"
npm run report:openapi -- --ref "$artemis_revision"
npm run report:openapi:verify
```

UI collection is incremental; use `--rebuild` after changing its analyzer. OpenAPI requires an explicit
`--ref`; UI defaults to `HEAD`. The OpenAPI collector discovers the committed specification and uses
tracked mapping/evidence defaults. `--spec`, `--spec-ref`, `--raw-spec`, `--raw-spec-ref`,
`--generation-evidence`, `--mapping` and `--evidence` support alternate inputs; use a separate output
directory for experiments. `--raw-spec-ref` requires `--raw-spec`.

OpenAPI fingerprints bind analyzer/schema sources and versions, parser JARs, lockfile, mapping,
evidence, input bytes and revisions. Changes invalidate cache reuse; `--rebuild` forces extraction.
Validated snapshots and manifest entries bind digests and identity. Logical `analyzedAt` uses the
latest input commit time, not the wall-clock collection time, making unchanged rebuilds byte-identical.

Collection adds/replaces the requested revision and preserves earlier entries/files. Recollecting a
revision with different configuration replaces that entry. Historical snapshots retain their original
analyzer evidence; isolated reproduction checks the pinned snapshot against the current collector.

`report:openapi:verify` defaults to `HEAD:artemis`, repository `artemis`, output `public/openapi` and
UI manifest `public/migrations/index.json`. It validates every retained artifact, rejects missing or
unlisted files and conflicting known input revisions, checks the UI pin, then freshly rebuilds the
pinned OpenAPI snapshot in isolation and compares its bytes and manifest entry. It never repairs data.

To reproduce from a sibling checkout without changing public artifacts:

```sh
artemis_revision=$(git rev-parse HEAD:artemis)
source_repo=/path/to/Artemis
reproduction_dir=$(mktemp -d)
cp -R public/migrations "$reproduction_dir/migrations"
npm run report:ui -- --repo "$source_repo" --ref "$artemis_revision" --output "$reproduction_dir/migrations"
diff -r public/migrations "$reproduction_dir/migrations"
npm run report:openapi:verify -- --repo "$source_repo" --ref "$artemis_revision" --ui-manifest "$reproduction_dir/migrations/index.json"
```

The copied UI cache preserves contributor identities and timestamps, avoiding authenticated lookups
for unchanged evidence. Verification accepts `--repo`, `--ref`, `--output` and `--ui-manifest` overrides.
For experimental OpenAPI inputs, run the collector with a temporary `--output`; a fresh manifest
contains only that revision, so compare its snapshot rather than the whole historical index.

## CI and verification

The [collection workflow](../.github/workflows/daily-report.yml) fetches `origin/develop`, passes one
explicit SHA to both collectors, and validates/reproduces OpenAPI before staging the submodule and
both report directories. Unchanged runs avoid empty commits. Publication passes the exact resulting
commit to verification and deployment; the existing freshness guard prevents stale deployment.

[PR CI](../.github/workflows/ci.yml) checks the branch head, reruns UI collection at the committed pin,
independently reproduces OpenAPI and checks both artifact directories including untracked files.
It also runs the standard checks and full Chromium/Firefox browser suite. Local checks are:

```sh
npm run lint
npm run format:check
npm run typecheck:report
npm test
npm run build
npm run report:openapi:verify
npx playwright install chromium firefox
npm run test:e2e -- --workers=2
```

Tests cover schemas, extraction fixtures, pinned source expectations, exclusions, wrappers, scope,
evidence bindings, cache invalidation, history/integrity, isolated reproduction and dashboard behavior.
Passing these checks establishes report correctness within documented limits, not runtime migration
or successful hosted publication.
