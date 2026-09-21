# Artemis client migration brief: exercise

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

- `src/main/webapp/app/exercise/review` (2 units)
  ```
  'src/main/webapp/app/exercise/review/**/*.html',
  "src/main/webapp/app/exercise/review/**/*.scss",
  @source './app/exercise/review';
  ```
- `src/main/webapp/app/exercise/dashboards/tutor-leaderboard` (1 unit)
  ```
  'src/main/webapp/app/exercise/dashboards/tutor-leaderboard/**/*.html',
  "src/main/webapp/app/exercise/dashboards/tutor-leaderboard/**/*.scss",
  @source './app/exercise/dashboards/tutor-leaderboard';
  ```
- `src/main/webapp/app/exercise/exercise-create-buttons/exercise-create-button` (1 unit)
  ```
  'src/main/webapp/app/exercise/exercise-create-buttons/exercise-create-button/**/*.html',
  "src/main/webapp/app/exercise/exercise-create-buttons/exercise-create-button/**/*.scss",
  @source './app/exercise/exercise-create-buttons/exercise-create-button';
  ```
- `src/main/webapp/app/exercise/exercise-headers/participation-mode-toggle` (1 unit)
  ```
  'src/main/webapp/app/exercise/exercise-headers/participation-mode-toggle/**/*.html',
  "src/main/webapp/app/exercise/exercise-headers/participation-mode-toggle/**/*.scss",
  @source './app/exercise/exercise-headers/participation-mode-toggle';
  ```
- `src/main/webapp/app/exercise/feedback/collapse` (1 unit)
  ```
  'src/main/webapp/app/exercise/feedback/collapse/**/*.html',
  "src/main/webapp/app/exercise/feedback/collapse/**/*.scss",
  @source './app/exercise/feedback/collapse';
  ```
- `src/main/webapp/app/exercise/feedback/node` (1 unit)
  ```
  'src/main/webapp/app/exercise/feedback/node/**/*.html',
  "src/main/webapp/app/exercise/feedback/node/**/*.scss",
  @source './app/exercise/feedback/node';
  ```
- `src/main/webapp/app/exercise/feedback/text` (1 unit)
  ```
  'src/main/webapp/app/exercise/feedback/text/**/*.html',
  "src/main/webapp/app/exercise/feedback/text/**/*.scss",
  @source './app/exercise/feedback/text';
  ```
- `src/main/webapp/app/exercise/rating` (1 unit)
  ```
  'src/main/webapp/app/exercise/rating/**/*.html',
  "src/main/webapp/app/exercise/rating/**/*.scss",
  @source './app/exercise/rating';
  ```
- `src/main/webapp/app/exercise/score-display` (1 unit)
  ```
  'src/main/webapp/app/exercise/score-display/**/*.html',
  "src/main/webapp/app/exercise/score-display/**/*.scss",
  @source './app/exercise/score-display';
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

## exercise — 910 hits, 34 of 96 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/exercise/additional-feedback/additional-feedback.component.html` — 1 hit
  - `alert`×1 → tum-ui-message
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/exercise/difficulty-level/difficulty-level.component.html` — 1 hit
  - `d-inline-flex`×1 → inline-flex
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-categories/custom-exercise-category-badge/custom-exercise-category-badge.component.html` — 1 hit
  - `badge`×1 → tum-ui-tag
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html` — 1 hit
  - `badge`×1 → tum-ui-tag
- `src/main/webapp/app/exercise/exercise-headers/included-in-score-badge/included-in-score-badge.component.html` — 1 hit
  - `badge`×1 → tum-ui-tag
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/exercise/exercise-headers/quiz-countdown/quiz-exercise-countdown.component.html` — 1 hit
  - `src/main/webapp/app/exercise/exercise-headers/quiz-countdown/quiz-exercise-countdown.component.scss`: 1 --bs-* variables
- `src/main/webapp/app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html` — 1 hit
  - `badge`×1 → tum-ui-tag
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/exercise/feedback/standalone-feedback/standalone-feedback.component.html` — 1 hit · route `/courses/:courseId/exercises/:exerciseId/participations/:participationId/results/:resultId/feedback`
  - `modal-padding`×1 → custom class: rename (banned by prefix only)
- `src/main/webapp/app/exercise/team/team-exercise-search/team-exercise-search.component.html` — 1 hit
  - `form-control`×1 → tumUiInput
  - ng-bootstrap: ngbTypeahead
- `src/main/webapp/app/exercise/team/team-owner-search/team-owner-search.component.html` — 1 hit
  - `form-control`×1 → tumUiInput
  - ng-bootstrap: ngbTypeahead
- `src/main/webapp/app/exercise/team/team-student-search/team-student-search.component.html` — 1 hit
  - `form-control`×1 → tumUiInput
  - ng-bootstrap: ngbTypeahead
- `src/main/webapp/app/exercise/exercise-update-notification/exercise-update-notification.component.html` — 2 hits
  - `form-control`×1 → tumUiInput
  - `form-control-sm`×1 → tumUiInput size
- `src/main/webapp/app/exercise/dashboards/tutor-participation-graph/progress-bar/progress-bar.component.html` — 3 hits
  - `justify-content-center`×1 → justify-center
  - `d-flex`×1 → flex
  - `w-100`×1 → w-full
  - PrimeNG: pTooltip → tumUiTooltip
- `src/main/webapp/app/exercise/exercise-group-date-notice/exercise-group-date-notice.component.html` — 3 hits
  - `d-block`×1 → block
  - `text-warning`×1 → text-state-warning
  - `src/main/webapp/app/exercise/exercise-group-date-notice/exercise-group-date-notice.component.scss`: 1 --bs-* variables
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/statistics-graph/score-distribution-graph/statistics-score-distribution-graph.component.html` — 3 hits
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-xl-2`×1 → xl:col-span-2
  - `col-xl-9`×1 → xl:col-span-9
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/team/team-participate/team-students-online-list.component.html` — 3 hits
  - `text-body-secondary`×1 → --text-body-secondary
  - ng-bootstrap: ngbTooltip
  - `src/main/webapp/app/exercise/team/team-participate/team-students-online-list.component.scss`: 2 --bs-* variables
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/statistics/doughnut-chart/doughnut-chart.component.html` — 4 hits
  - `d-flex`×1 → flex
  - `flex-column`×1 → flex-col
  - `justify-content-between`×1 → justify-between
  - `h-100`×1 → h-full
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-info/exercise-info.component.html` — 5 hits
  - `src/main/webapp/app/exercise/exercise-info/exercise-info.component.scss`: 2 --bs-* variables, 3 Bootstrap Sass imports
- `src/main/webapp/app/exercise/mode-picker/mode-picker.component.html` — 5 hits
  - `d-flex`×1 → flex
  - `align-items-start`×1 → items-start
  - `btn-group`×1 → tum-ui-button-group
  - `btn`×1 → tum-ui-button / tumUiButton
  - `btn-default`×1 → custom class: rename (banned by prefix only)
- `src/main/webapp/app/exercise/presentation-score/presentation-score.component.ts` — 5 hits
  - `form-group`×1 → tum-ui-form-field
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `text-secondary`×1 → --text-body-secondary
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/exercise/team/team-participate/team-students-list.component.html` — 5 hits
  - `list-group`×1, `list-group-horizontal`×1, `list-group-item`×1 → tum-ui-list
  - `src/main/webapp/app/exercise/team/team-participate/team-students-list.component.scss`: 2 raw colors
- `src/main/webapp/app/exercise/feedback/feedback-suggestions-pending-confirmation-dialog/feedback-suggestions-pending-confirmation-dialog.component.html` — 7 hits
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `btn`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
- `src/main/webapp/app/exercise/category-selector-primeng/category-selector-primeng.component.html` — 8 hits
  - PrimeNG: p-autocomplete → tum-ui-autocomplete
  - `src/main/webapp/app/exercise/category-selector-primeng/category-selector-primeng.component.scss`: 6 --bs-* variables, 2 raw colors
- `src/main/webapp/app/exercise/exercise-scores/export-button/exercise-scores-export-button.component.html` — 11 hits
  - `btn`×2, `btn-info`×2, `btn-sm`×2 → tum-ui-button / tumUiButton
  - `d-none`×2 → hidden
  - `d-md-inline`×2 → md:inline
  - `d-inline`×1 → inline
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbTooltip
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/submission-export/dialog/submission-export-dialog.component.html` — 11 hits
  - `form-check-input`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `btn`×2, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `form-group`×1 → tum-ui-form-field
  - `btn-default`×1 → custom class: rename (banned by prefix only)
  - `d-flex`×1 → flex
  - `justify-content-center`×1 → justify-center
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-update-warning/exercise-update-warning.component.html` — 12 hits
  - `btn`×4, `btn-secondary`×1, `btn-warning`×1, `btn-success`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `text-danger`×1 → text-state-danger
  - `form-group`×1 → tum-ui-form-field
  - ng-bootstrap: NgbActiveModal
- `src/main/webapp/app/exercise/included-in-overall-score-picker/included-in-overall-score-picker.component.html` — 12 hits
  - `btn-default`×5 → custom class: rename (banned by prefix only)
  - `btn`×3, `btn-primary`×3 → tum-ui-button / tumUiButton
  - `btn-group`×1 → tum-ui-button-group
- `src/main/webapp/app/exercise/submission-policy/submission-policy-update.component.ts` — 12 hits
  - `col`×2 → flex-1
  - `input-group`×2 → tum-ui-input-group
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `form-select`×1 → tum-ui-select
  - `row`×1 → grid grid-cols-12 (or flex)
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-scores/manage-assessment-buttons/manage-assessment-buttons.component.html` — 14 hits
  - `btn`×2, `btn-sm`×2, `btn-success`×1, `btn-primary`×1, `btn-warning`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `d-none`×2 → hidden
  - `d-xl-inline`×2 → xl:inline
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/difficulty-picker/difficulty-picker.component.html` — 15 hits
  - `btn-default`×6 → custom class: rename (banned by prefix only)
  - `btn`×4, `btn-primary`×1, `btn-success`×1, `btn-warning`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `btn-group`×1 → tum-ui-button-group
- `src/main/webapp/app/exercise/shared/filter-dropdown/filter-dropdown.component.html` — 18 hits
  - `d-flex`×2 → flex
  - `align-items-center`×2 → items-center
  - PrimeNG: p-select → tum-ui-select
  - `src/main/webapp/app/exercise/shared/filter-dropdown/filter-dropdown.component.scss`: 9 --bs-* variables, 5 raw colors
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-headers/exercise-headers-information/result-history-dropdown/result-history-dropdown.component.html` — 29 hits
  - `d-flex`×6 → flex
  - `align-items-center`×5 → items-center
  - `text-body-tertiary`×3, `text-body-secondary`×1 → --text-body-secondary
  - `flex-shrink-0`×3 → shrink-0
  - `justify-content-between`×1 → justify-between
  - `list-group`×1, `list-group-flush`×1, `list-group-item`×1, `list-group-item-action`×1 → tum-ui-list
  - `align-self-stretch`×1 → self-stretch
  - `flex-grow-1`×1 → grow
  - `flex-column`×1 → flex-col
  - `text-truncate`×1 → truncate
  - PrimeNG: p-popover → tum-ui-popover, pTooltip → tumUiTooltip, p-tag → tum-ui-tag, p-button → tum-ui-button
  - `src/main/webapp/app/exercise/exercise-headers/exercise-headers-information/result-history-dropdown/result-history-dropdown.component.scss`: 1 --bs-* variables, 1 raw colors
  - 8 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/statistics-graph/average-score-graph/statistics-average-score-graph.component.html` — 30 hits
  - `d-flex`×6 → flex
  - `align-items-center`×4 → items-center
  - `form-check-input`×4 → tum-ui-checkbox / tum-ui-radio-button
  - `row`×2 → grid grid-cols-12 (or flex)
  - `justify-content-center`×2 → justify-center
  - `flex-column`×2 → flex-col
  - `col-1`×2 → col-span-1
  - `col-xl-1`×1 → xl:col-span-1
  - `col-xl-11`×1 → xl:col-span-11
  - `justify-content-end`×1 → justify-end
  - `col-lg-8`×1 → lg:col-span-8
  - `col-lg-2`×1 → lg:col-span-2
  - `btn`×1, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 17 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/external-submission/external-submission-dialog.component.html` — 43 hits
  - `form-group`×7 → tum-ui-form-field
  - `btn`×5, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `form-control`×4 → tumUiInput
  - `col-md-6`×4 → md:col-span-6
  - `text-danger`×3 → text-state-danger
  - `form-check`×3, `form-check-input`×3, `form-check-label`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `btn-default`×3 → custom class: rename (banned by prefix only)
  - `row`×2 → grid grid-cols-12 (or flex)
  - `align-items-end`×2 → items-end
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - 5 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/exercise/exercise-filter/exercise-filter-modal.component.html` — 26 hits
  - `form-group`×5, `form-control-label`×5 → tum-ui-form-field
  - `btn`×3, `btn-outline-secondary`×1, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `form-check`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `form-control`×1 → tumUiInput
  - `row`×1 → grid grid-cols-12 (or flex)
  - `d-flex`×1 → flex
  - ng-bootstrap: NgbActiveModal, ngbTypeahead
  - 6 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/exercise/exercise-categories/custom-exercise-category-badge/custom-exercise-category-badge.component.html`
- `src/main/webapp/app/exercise/synchronization/metadata/exercise-metadata-conflict-modal.component.html` — 69 hits
  - `d-flex`×11 → flex
  - `col-12`×10 → col-span-12
  - `col-md-6`×10 → md:col-span-6
  - `h-100`×10 → h-full
  - `text-body-secondary`×10 → --text-body-secondary
  - `row`×5 → grid grid-cols-12 (or flex)
  - `g-3`×5 → gap-3 (convert by size)
  - `justify-content-between`×4 → justify-between
  - `flex-column`×3 → flex-col
  - `justify-content-end`×1 → justify-end
  - PrimeNG: p-button → tum-ui-button, p-table → tum-ui-table
  - 47 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/exercise/exercise-categories/custom-exercise-category-badge/custom-exercise-category-badge.component.html`
- `src/main/webapp/app/exercise/team/team-update-dialog/team-update-dialog.component.html` — 55 hits
  - `text-danger`×9 → text-state-danger
  - `d-flex`×7 → flex
  - `form-group`×4 → tum-ui-form-field
  - `align-items-center`×4 → items-center
  - `form-control`×2 → tumUiInput
  - `form-control-error`×2 → no guideline target
  - `align-items-end`×2 → items-end
  - `list-group-item-container`×2, `list-group-item-index`×2, `list-group--students`×1, `list-group-item-error`×1 → custom class: rename (banned by prefix only)
  - `list-group-item`×2, `list-group`×1 → tum-ui-list
  - `text-body-secondary`×2 → --text-body-secondary
  - `btn`×2, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `alert`×1, `alert-info`×1, `alert-warning`×1 → tum-ui-message
  - `justify-content-between`×1 → justify-between
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `src/main/webapp/app/exercise/team/team-update-dialog/team-update-dialog.component.scss`: 1 --bs-* variables
  - 7 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (2 hits): `app/exercise/team/team-owner-search/team-owner-search.component.html`, `app/exercise/team/team-student-search/team-student-search.component.html`
- `src/main/webapp/app/exercise/dashboards/tutor-participation-graph/tutor-participation-graph.component.html` — 2 hits
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-center`×1 → justify-center
  - PrimeNG: pTooltip → tumUiTooltip
  - 2 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (3 hits): `app/exercise/dashboards/tutor-participation-graph/progress-bar/progress-bar.component.html`
- `src/main/webapp/app/exercise/team/team-participation-table/team-participation-table.component.html` — 3 hits
  - `d-flex`×1 → flex
  - `justify-content-start`×1 → justify-start
  - `align-items-center`×1 → items-center
  - PrimeNG: pButton → tumUiButton, pTooltip → tumUiTooltip
  - 2 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (3 hits): `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/shared-ui/table-view/table-view.html`
- `src/main/webapp/app/exercise/exercise-categories/exercise-categories.component.html` — 3 hits
  - `badge`×2 → tum-ui-tag
  - `bg-success`×1 → bg-state-success
  - imports 3 units with Bootstrap (4 hits): `app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html`, `app/exercise/exercise-headers/included-in-score-badge/included-in-score-badge.component.html`, `app/shared-ui/components/not-released-tag/not-released-tag.component.html`
- `src/main/webapp/app/exercise/statistics/exercise-detail-statistic/exercise-detail-statistics.component.html` — 6 hits
  - `col-md-4`×3 → md:col-span-4
  - `row`×1 → grid grid-cols-12 (or flex)
  - `d-flex`×1 → flex
  - `justify-content-between`×1 → justify-between
  - imports 1 unit with Bootstrap (4 hits): `app/exercise/statistics/doughnut-chart/doughnut-chart.component.html`
- `src/main/webapp/app/exercise/participation-submission/participation-submission.component.html` — 17 hits
  - `badge`×4 → tum-ui-tag
  - `d-flex`×4 → flex
  - `flex-column`×4 → flex-col
  - `btn`×2, `btn-danger`×1, `btn-sm`×1, `btn-link`×1 → tum-ui-button / tumUiButton
  - 5 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (4 hits): `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`, `app/shared-ui/table-view/table-view.html`
- `src/main/webapp/app/exercise/exercise-detail-common-actions/non-programming-exercise-detail-common-actions.component.html` — 47 hits
  - `btn`×10, `btn-sm`×10, `btn-info`×4, `btn-warning`×2, `btn-primary`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `d-none`×8 → hidden
  - `d-md-inline`×8 → md:inline
  - `d-flex`×1 → flex
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (4 hits): `app/shared-ui/components/feature-overlay/feature-overlay.component.ts`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/exercise/import/from-file/exercise-import-from-file.component.html` — 1 hit
  - `modal-body`×1 → tum-ui-dialog
  - imports 1 unit with Bootstrap (5 hits): `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/exercise/team-config-form-group/team-config-form-group.component.html` — 13 hits
  - `input-group-text`×2, `input-group`×1 → tum-ui-input-group
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `form-group`×1 → tum-ui-form-field
  - `row`×1 → grid grid-cols-12 (or flex)
  - `input-group-prepend`×1, `input-group-append`×1 → custom class: rename (banned by prefix only)
  - imports 1 unit with Bootstrap (5 hits): `app/exercise/mode-picker/mode-picker.component.html`
- `src/main/webapp/app/exercise/example-submission/example-submission-import/example-submission-import.component.html` — 14 hits
  - `text-secondary`×2 → --text-body-secondary
  - `modal-header`×1, `modal-title`×1, `modal-body`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `form-group`×1, `form-control-label`×1 → tum-ui-form-field
  - `form-control`×1 → tumUiInput
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `d-flex`×1 → flex
  - `justify-content-between`×1 → justify-between
  - PrimeNG: p-paginator → tum-ui-paginator
  - ng-bootstrap: ngbTooltip
  - 5 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (5 hits): `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/exercise/import/exercise-import.component.html` — 25 hits
  - `col-1`×4 → col-span-1
  - `col-4`×4 → col-span-4
  - `col-2`×3 → col-span-2
  - `form-check`×2, `form-check-input`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `modal-body`×1 → tum-ui-dialog
  - `form-group`×1 → tum-ui-form-field
  - `form-control`×1 → tumUiInput
  - `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `col-3`×1 → col-span-3
  - `d-flex`×1 → flex
  - `justify-content-between`×1 → justify-between
  - PrimeNG: p-paginator → tum-ui-paginator
  - ng-bootstrap: ngb-highlight
  - 3 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (5 hits): `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/exercise/team/team-participate/team-participate-info-box.component.html` — 4 hits
  - `d-flex`×1 → flex
  - `justify-content-end`×1 → justify-end
  - `src/main/webapp/app/exercise/team/team-participate/team-participate-info-box.component.scss`: 2 raw colors
  - 1 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (7 hits): `app/exercise/team/team-participate/team-students-online-list.component.html`, `app/shared-ui/connection-status/connection-status.component.html`
- `src/main/webapp/app/exercise/exercise-headers/with-details/header-exercise-page-with-details.component.html` — 17 hits
  - `badge`×12 → tum-ui-tag
  - `bg-success`×5 → bg-state-success
  - ng-bootstrap: ngbTooltip
  - 2 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (7 hits): `app/exercise/exercise-categories/exercise-categories.component.html`, `app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html`, `app/exercise/exercise-headers/included-in-score-badge/included-in-score-badge.component.html`, `app/shared-ui/components/not-released-tag/not-released-tag.component.html`
- `src/main/webapp/app/exercise/team/teams-import-dialog/teams-import-dialog.component.html` — 74 hits
  - `d-flex`×11 → flex
  - `btn`×5, `btn-primary`×2, `btn-warning`×2, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `form-group`×5 → tum-ui-form-field
  - `list-group-item--teams`×5, `btn-default`×2, `list-group-item-container`×2, `list-group-item-index`×2, `list-group--teams`×1 → custom class: rename (banned by prefix only)
  - `text-danger`×4 → text-state-danger
  - `align-items-end`×3 → items-end
  - `text-body-secondary`×3 → --text-body-secondary
  - `align-items-center`×2 → items-center
  - `list-group-item`×2, `list-group`×1 → tum-ui-list
  - `align-items-start`×2 → items-start
  - `badge`×2 → tum-ui-tag
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-center`×1 → justify-center
  - `card-header`×1 → tum-ui-card / tum-ui-panel
  - `btn-group`×1 → tum-ui-button-group
  - `justify-content-between`×1 → justify-between
  - `flex-column`×1 → flex-col
  - `bg-danger`×1 → bg-state-danger
  - `bg-success`×1 → bg-state-success
  - `flex-shrink-0`×1 → shrink-0
  - `flex-grow-1`×1 → grow
  - `justify-content-end`×1 → justify-end
  - `src/main/webapp/app/exercise/team/teams-import-dialog/teams-import-dialog.component.scss`: 1 --bs-* variables, 3 raw colors
  - 30 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (9 hits): `app/exercise/team/team-exercise-search/team-exercise-search.component.html`, `app/exercise/team/team-participate/team-students-list.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/exercise/structured-grading-criterion/grading-instructions-details/grading-instructions-details.component.html` — 66 hits
  - `form-control`×7 → tumUiInput
  - `btn`×6, `btn-secondary`×2, `btn-danger`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `btn-block`×5, `input-group-btn`×3, `btn-default`×2, `btn-md`×1 → custom class: rename (banned by prefix only)
  - `row`×4 → grid grid-cols-12 (or flex)
  - `col-12`×3 → col-span-12
  - `d-flex`×3 → flex
  - `col-sm-6`×3 → sm:col-span-6
  - `col-md-auto`×3 → md:flex-1
  - `col-xl-3`×2 → xl:col-span-3
  - `col-md-8`×2 → md:col-span-8
  - `align-items-center`×2 → items-center
  - `col-sm-auto`×1 → sm:flex-1
  - `col-md-9`×1 → md:col-span-9
  - `form-control-label`×1, `form-group`×1 → tum-ui-form-field
  - `col-sm-2`×1 → sm:col-span-2
  - `col-md-3`×1 → md:col-span-3
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `col-2`×1 → col-span-2
  - `col-md-10`×1 → md:col-span-10
  - `input-group`×1 → tum-ui-input-group
  - `col-md-4`×1 → md:col-span-4
  - ng-bootstrap: ngbTooltip
  - `src/main/webapp/app/exercise/structured-grading-criterion/grading-instructions-details/grading-instructions-details.component.scss`: 1 raw colors
  - 19 Bootstrap spacing classes to convert by size
  - imports 5 units with Bootstrap (12 hits): `app/communication/posting-button/posting-button.component.html`, `app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html`, `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/iris/overview/iris-logo/iris-logo.component.html`
- `src/main/webapp/app/exercise/statistics/exercise-statistics.component.html` — 19 hits · route `/course-management/:courseId/text-exercises/:exerciseId/exercise-statistics`
  - `btn`×5, `btn-secondary`×5 → tum-ui-button / tumUiButton
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-md-2`×1 → md:col-span-2
  - `d-flex`×1 → flex
  - `justify-content-around`×1 → justify-around
  - `w-100`×1 → w-full
  - `col-md-9`×1 → md:col-span-9
  - `btn-group`×1 → tum-ui-button-group
  - `btn-group-toggle`×1 → custom class: rename (banned by prefix only)
  - 4 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (13 hits): `app/exercise/statistics-graph/score-distribution-graph/statistics-score-distribution-graph.component.html`, `app/exercise/statistics/doughnut-chart/doughnut-chart.component.html`, `app/exercise/statistics/exercise-detail-statistic/exercise-detail-statistics.component.html`
- `src/main/webapp/app/exercise/example-submission/example-submissions.component.html` — 25 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId/example-submissions`
  - `col-12`×2 → col-span-12
  - `btn`×2, `btn-primary`×2, `btn-link`×2 → tum-ui-button / tumUiButton
  - `d-xl-none`×2 → xl:hidden
  - `d-none`×2 → hidden
  - `d-xl-inline`×2 → xl:inline
  - `text-secondary`×2 → --text-body-secondary
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-sm`×1, `col-sm-auto`×1 → sm:flex-1
  - `d-flex`×1 → flex
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `text-danger`×1 → text-state-danger
  - `text-warning`×1 → text-state-warning
  - ng-bootstrap: ngbTooltip
  - 8 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (22 hits): `app/exercise/example-submission/example-submission-import/example-submission-import.component.html`, `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/exercise/example-solution/example-solution.component.html` — 9 hits · route `/courses/:courseId/:dynamic/:examId/exercises/:exerciseId/example-solution`
  - `row`×3 → grid grid-cols-12 (or flex)
  - `align-items-baseline`×2 → items-baseline
  - `col`×1 → flex-1
  - `flex-grow-1`×1 → grow
  - `col-12`×1 → col-span-12
  - `col-md-12`×1 → md:col-span-12
  - 6 Bootstrap spacing classes to convert by size
  - imports 6 units with Bootstrap (25 hits): `app/exercise/exercise-categories/exercise-categories.component.html`, `app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html`, `app/exercise/exercise-headers/included-in-score-badge/included-in-score-badge.component.html`, `app/exercise/exercise-headers/with-details/header-exercise-page-with-details.component.html`, `app/shared-ui/components/not-released-tag/not-released-tag.component.html`, `app/shared-ui/directives/resizable.directive.ts`
- `src/main/webapp/app/exercise/import/exercise-import-tabs/exercise-import-tabs.component.html` — 1 hit
  - `nav-tabs`×1 → tum-ui-tabs
  - ng-bootstrap: ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 1 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (31 hits): `app/exercise/import/exercise-import.component.html`, `app/exercise/import/from-file/exercise-import-from-file.component.html`, `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/exercise/exercise-headers/exercise-header-actions/exercise-header-actions.component.html` — 18 hits
  - `d-flex`×3 → flex
  - `btn`×3, `btn-danger`×1, `btn-sm`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `align-items-center`×2 → items-center
  - `btn-group`×2 → tum-ui-button-group
  - `flex-shrink-0`×1 → shrink-0
  - `d-inline`×1 → inline
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - `text-muted`×1 → --text-body-secondary
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbPopover, ngbTooltip
  - 10 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (56 hits): `app/course/overview/exercise-details/request-feedback-button/request-feedback-button.component.html`, `app/shared-ui/components/buttons/code-button/code-button.component.html`, `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html`
- `src/main/webapp/app/exercise/exercise-headers/exercise-headers-information/exercise-headers-information.component.html` — 8 hits
  - `d-flex`×2 → flex
  - `align-items-center`×2 → items-center
  - `align-self-stretch`×1 → self-stretch
  - `align-items-stretch`×1 → items-stretch
  - `text-truncate`×1 → truncate
  - `d-inline-flex`×1 → inline-flex
  - ng-bootstrap: ngbTooltip
  - 3 Bootstrap spacing classes to convert by size
  - imports 9 units with Bootstrap (61 hits): `app/course/overview/submission-result-status/submission-result-status.component.html`, `app/exercise/difficulty-level/difficulty-level.component.html`, `app/exercise/exercise-categories/exercise-categories.component.html`, `app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html`, `app/exercise/exercise-headers/exercise-headers-information/result-history-dropdown/result-history-dropdown.component.html`, `app/exercise/exercise-headers/included-in-score-badge/included-in-score-badge.component.html`, `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/components/not-released-tag/not-released-tag.component.html`, …
- `src/main/webapp/app/exercise/team/team.component.html` — 12 hits · route `/course-management/:courseId/exercises/:exerciseId/teams/:teamId`
  - `d-flex`×4 → flex
  - `d-inline-block`×3 → inline-block
  - `text-body-secondary`×3 → --text-body-secondary
  - `align-items-baseline`×2 → items-baseline
  - PrimeNG: pTooltip → tumUiTooltip
  - 9 Bootstrap spacing classes to convert by size
  - imports 7 units with Bootstrap (66 hits): `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/exercise/team/team-owner-search/team-owner-search.component.html`, `app/exercise/team/team-participation-table/team-participation-table.component.html`, `app/exercise/team/team-student-search/team-student-search.component.html`, `app/exercise/team/team-update-dialog/team-update-dialog.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`, `app/shared-ui/table-view/table-view.html`
- `src/main/webapp/app/exercise/participation/participation.component.html` — 41 hits
  - `btn`×7, `btn-sm`×7, `btn-info`×3, `btn-danger`×1, `btn-outline-success`×1, `btn-outline-danger`×1, `btn-link`×1 → tum-ui-button / tumUiButton
  - `d-none`×4 → hidden
  - `d-flex`×3 → flex
  - `d-xl-inline`×3 → xl:inline
  - `align-items-center`×2 → items-center
  - `btn-group`×2 → tum-ui-button-group
  - `text-secondary`×2 → --text-body-secondary
  - `d-md-inline`×1 → md:inline
  - `flex-column`×1 → flex-col
  - `h-100`×1 → h-full
  - `form-control`×1 → tumUiInput
  - 9 Bootstrap spacing classes to convert by size
  - imports 8 units with Bootstrap (93 hits): `app/exercise/shared/filter-dropdown/filter-dropdown.component.html`, `app/exercise/team/team-participate/team-students-list.component.html`, `app/programming/shared/actions/instructor-submission-state/programming-exercise-instructor-submission-state.component.html`, `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/components/buttons/code-button/code-button.component.html`, `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`, `app/shared-ui/table-view/table-view.html`
- `src/main/webapp/app/exercise/team/teams/teams.component.html` — 5 hits · route `/course-management/:courseId/exercises/:exerciseId/teams`
  - `d-flex`×2 → flex
  - `align-items-center`×2 → items-center
  - `justify-content-between`×1 → justify-between
  - PrimeNG: p-select-button → tum-ui-select-button
  - 4 Bootstrap spacing classes to convert by size
  - imports 8 units with Bootstrap (141 hits): `app/exercise/team/team-exercise-search/team-exercise-search.component.html`, `app/exercise/team/team-owner-search/team-owner-search.component.html`, `app/exercise/team/team-participate/team-students-list.component.html`, `app/exercise/team/team-student-search/team-student-search.component.html`, `app/exercise/team/team-update-dialog/team-update-dialog.component.html`, `app/exercise/team/teams-import-dialog/teams-import-dialog.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`, `app/shared-ui/table-view/table-view.html`
- `src/main/webapp/app/exercise/exercise-headers/exercise-header/exercise-header.component.html` — 12 hits
  - `d-flex`×4 → flex
  - `align-items-center`×4 → items-center
  - `flex-shrink-0`×3 → shrink-0
  - `text-truncate`×1 → truncate
  - 5 Bootstrap spacing classes to convert by size
  - imports 16 units with Bootstrap (159 hits): `app/course/overview/exercise-details/request-feedback-button/request-feedback-button.component.html`, `app/course/overview/submission-result-status/submission-result-status.component.html`, `app/course/shared/course-sidebar-toggle-button/course-sidebar-toggle-button.component.html`, `app/exercise/difficulty-level/difficulty-level.component.html`, `app/exercise/exercise-categories/exercise-categories.component.html`, `app/exercise/exercise-headers/difficulty-badge/difficulty-badge.component.html`, `app/exercise/exercise-headers/exercise-header-actions/exercise-header-actions.component.html`, `app/exercise/exercise-headers/exercise-headers-information/exercise-headers-information.component.html`, …
- `src/main/webapp/app/exercise/exercise-scores/exercise-scores.component.html` — 44 hits
  - `btn`×8, `btn-sm`×7, `btn-primary`×5, `btn-info`×3 → tum-ui-button / tumUiButton
  - `d-none`×6 → hidden
  - `d-md-inline`×4 → md:inline
  - `d-flex`×3 → flex
  - `align-items-center`×2 → items-center
  - `d-xl-inline`×2 → xl:inline
  - `d-inline-block`×1 → inline-block
  - `flex-column`×1 → flex-col
  - `h-100`×1 → h-full
  - `btn-group`×1 → tum-ui-button-group
  - PrimeNG: pTooltip → tumUiTooltip
  - ng-bootstrap: ngbPopover
  - 11 Bootstrap spacing classes to convert by size
  - imports 10 units with Bootstrap (170 hits): `app/exercise/exercise-scores/export-button/exercise-scores-export-button.component.html`, `app/exercise/exercise-scores/manage-assessment-buttons/manage-assessment-buttons.component.html`, `app/exercise/external-submission/external-submission-dialog.component.html`, `app/exercise/shared/filter-dropdown/filter-dropdown.component.html`, `app/exercise/submission-export/dialog/submission-export-dialog.component.html`, `app/programming/manage/assess/repo-export/export-dialog/programming-assessment-repo-export-dialog.component.html`, `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/components/buttons/code-button/code-button.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
