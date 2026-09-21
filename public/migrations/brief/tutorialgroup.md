# Artemis client migration brief: tutorialgroup

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

- `src/main/webapp/app/tutorialgroup/manage/holidays` (4 units)
  ```
  'src/main/webapp/app/tutorialgroup/manage/holidays/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/holidays/**/*.scss",
  @source './app/tutorialgroup/manage/holidays';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-create-container` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-create-container/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-create-container/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-create-container';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-create-or-edit` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-create-or-edit/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-create-or-edit/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-create-or-edit';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-edit-container` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-edit-container/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-edit-container/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-edit-container';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-edit-languages-input` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-edit-languages-input/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-edit-languages-input/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-edit-languages-input';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-group-session-create-or-edit-modal` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-group-session-create-or-edit-modal/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-group-session-create-or-edit-modal/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-group-session-create-or-edit-modal';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-group-utilization-indicator` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-group-utilization-indicator/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-group-utilization-indicator/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-group-utilization-indicator';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-registrations-import-modal';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal-table` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal-table/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-import-modal-table/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-registrations-import-modal-table';
  ```
- `src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-register-search-bar` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-register-search-bar/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/tutorial-registrations-register-search-bar/**/*.scss",
  @source './app/tutorialgroup/manage/tutorial-registrations-register-search-bar';
  ```
- `src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-chip` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-chip/**/*.html',
  "src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-chip/**/*.scss",
  @source './app/tutorialgroup/shared/tutorial-group-detail-session-status-chip';
  ```
- `src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-indicator` (1 unit)
  ```
  'src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-indicator/**/*.html',
  "src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail-session-status-indicator/**/*.scss",
  @source './app/tutorialgroup/shared/tutorial-group-detail-session-status-indicator';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/directives/resizable.directive.ts` ([jhiResizable]): imported by 16 Bootstrap-free units; 1 hit: card-resizable
- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `src/main/webapp/app/communication/posting-button/posting-button.component.html` (button[jhi-posting-button]): imported by 10 Bootstrap-free units; 3 hits: btn, btn-outline-primary, btn-sm
- `src/main/webapp/app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html` (jhi-redirect-to-iris-button): imported by 10 Bootstrap-free units; 3 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` (jhi-markdown-editor-monaco): imported by 10 Bootstrap-free units; 4 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` (button[jhi-exercise-action-button]): imported by 8 Bootstrap-free units; 12 hits: btn, btn-outline-primary, btn-sm, btn-primary, btn-secondary, d-none, d-md-inline, d-xl-inline

## tutorialgroup — 150 hits, 28 of 32 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/tutorialgroup/manage/tutorial-groups-management/tutorial-groups-export-button.component/tutorial-groups-export-button.component.html` — 6 hits
  - `form-check`×2, `form-check-input`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - PrimeNG: p-dialog → tum-ui-dialog
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/tutorialgroup/manage/tutorial-groups-configuration/crud/tutorial-groups-configuration-form/tutorial-groups-configuration-form.component.html` — 31 hits
  - `form-text`×3, `invalid-feedback`×2, `form-group`×1 → tum-ui-form-field
  - `btn`×3, `btn-check`×2, `btn-outline-secondary`×2, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-12`×2 → col-span-12
  - `text-body-secondary`×2 → --text-body-secondary
  - `d-block`×2 → block
  - `w-100`×1 → w-full
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - `btn-group`×1 → tum-ui-button-group
  - `d-flex`×1 → flex
  - `justify-content-end`×1 → justify-end
  - PrimeNG: p-datepicker → tum-ui-date-picker
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/tutorialgroup/manage/tutorial-groups-management/tutorial-groups-import-dialog/tutorial-groups-registration-import-dialog.component.html` — 107 hits
  - `btn`×11, `btn-outline-secondary`×5, `btn-check`×3, `btn-secondary`×2, `btn-outline-success`×1, `btn-outline-danger`×1, `btn-primary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `d-inline-block`×11 → inline-block
  - `text-truncate`×11 → truncate
  - `form-group`×9 → tum-ui-form-field
  - `d-flex`×8 → flex
  - `table`×5, `table-striped`×5, `table-bordered`×5, `table-sm`×5, `table-responsive`×2 → tum-ui-table / tumUiTable
  - `align-items-center`×4 → items-center
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `align-items-end`×1 → items-end
  - `text-danger`×1 → text-state-danger
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `btn-group`×1 → tum-ui-button-group
  - `justify-content-between`×1 → justify-between
  - `w-100`×1 → w-full
  - `flex-shrink-0`×1 → shrink-0
  - `flex-grow-1`×1 → grow
  - `justify-content-end`×1 → justify-end
  - PrimeNG: p-dialog → tum-ui-dialog
  - 21 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/tutorialgroup/shared/tutorial-group-detail/tutorial-group-detail.component.html` — 6 hits
  - `card`×4 → tum-ui-card / tum-ui-panel
  - `card-row`×2 → custom class: rename (banned by prefix only)
  - PrimeNG: pButton → tumUiButton, p-selectbutton → tum-ui-select-button, pTooltip → tumUiTooltip, p-confirmdialog → tum-ui-confirm-dialog
  - imports 2 units with Bootstrap (18 hits): `app/course/shared/course-sidebar-toggle-button/course-sidebar-toggle-button.component.html`, `app/shared-ui/profile-picture/profile-picture.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
