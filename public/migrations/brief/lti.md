# Artemis client migration brief: lti

> Bootstrap → Tailwind / TUM UI. Generated from Artemis `5be30e1d` (Development: Improve input validation for assessment feedback and text block ids (#13917), https://github.com/ls1intum/Artemis/pull/13917). Paths are relative to the Artemis repository. Hits are class tokens matched by Artemis's own `no-bootstrap-classes` rule plus SCSS residue; a unit is done when its directory is in the lock list. Guideline: https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/guidelines/client-development.mdx

## Status

- 9123 Bootstrap hits in 584 of 1004 units; 137 units locked, 283 Bootstrap-free but unlocked
- 41 of 189 routed pages import no Bootstrap, not counting the global shell
- 80 directories can be locked now (configuration-only change)

## How to migrate

1. Convert the whole rendering closure of a unit, never half: a migrated element under a Bootstrap ancestor loses the cascade. Leave app-wide shared units (navbar, footer, delete dialog) as they are until they are migrated as their own locked units; do not put a Tailwind utility on their host.
2. Replace each Bootstrap class with the target listed for it; use the TUM UI kit component where one exists (reference: https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/tum-ui.mdx). Import kit symbols from `@tumaet/ui-angular`.
3. Convert spacing by size, not by name: Bootstrap `mb-3` is 1rem, Tailwind `mb-4` is 1rem. Replace raw colors and `--bs-*` variables in SCSS with semantic tokens (`text-state-*`, `--text-body-secondary`); delete SCSS that only restyled Bootstrap.
4. Verify locally with `pnpm migrate:check <path under src/main/webapp/app>` (prints remaining hits, exit 0 when ready to lock) and `pnpm migrate:status`.
5. When a directory is ready, add its three entries: the `.html` glob to the `files` array of the block that enables `localRules/no-bootstrap-classes` in `eslint.config.mjs`, the `.scss` glob to the `--bs-`/hex override in `.stylelintrc.json`, and the `@source` line (relative to `src/main/webapp/tailwind.css`) to `tailwind.css`. Then run `pnpm run test:rules && pnpm run lint && pnpm run stylelint && pnpm run prettier:check`, restart the dev server and check light and dark mode.

Work order: shared units with few hits and many dependants first, then units that import nothing with hits (they can be locked right after), then the rest.

## Lock now

- `src/main/webapp/app/lti/overview` (3 units)
  ```
  'src/main/webapp/app/lti/overview/**/*.html',
  "src/main/webapp/app/lti/overview/**/*.scss",
  @source './app/lti/overview';
  ```

## lti — 59 hits, 3 of 6 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/lti/manage/lti-course-card/lti-course-card.component.html` — 13 hits
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-2`×2 → col-span-2
  - `col-6`×2 → col-span-6
  - `card`×1, `card-header`×1, `card-title`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `d-flex`×1 → flex
  - `col-7`×1 → col-span-7
  - `text-muted`×1 → --text-body-secondary
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/lti/manage/lti13-deep-linking/lti13-deep-linking.component.html` — 42 hits · route `/lti/exercises/:courseId`
  - `form-check-input`×7 → tum-ui-checkbox / tum-ui-radio-button
  - `d-sm-inline`×6 → sm:inline
  - `btn`×4, `btn-secondary`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `d-md-table-cell`×4 → md:table-cell
  - `dropdown-section`×2, `dropdown-container`×1 → custom class: rename (banned by prefix only)
  - `dropdown-toggle`×2 → tum-ui-menu
  - `table-responsive`×2, `table`×2, `table-bordered`×2 → tum-ui-table / tumUiTable
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `col`×1 → flex-1
  - `d-flex`×1 → flex
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 8 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/lti/manage/lti13-select-course/lti13-select-course.component.html` — 4 hits · route `/lti/select-course`
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-12`×1 → col-span-12
  - `col-lg-6`×1 → lg:col-span-6
  - `col-xl-4`×1 → xl:col-span-4
  - 4 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (13 hits): `app/lti/manage/lti-course-card/lti-course-card.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
