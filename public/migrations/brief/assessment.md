# Artemis client migration brief: assessment

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

- `src/main/webapp/app/assessment/manage/assessment-instructions/expandable-section` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-instructions/expandable-section/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-instructions/expandable-section/**/*.scss",
  @source './app/assessment/manage/assessment-instructions/expandable-section';
  ```
- `src/main/webapp/app/assessment/manage/assessment-note` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-note/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-note/**/*.scss",
  @source './app/assessment/manage/assessment-note';
  ```
- `src/main/webapp/app/assessment/manage/assessment-workspace` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-workspace/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-workspace/**/*.scss",
  @source './app/assessment/manage/assessment-workspace';
  ```
- `src/main/webapp/app/assessment/shared/assessment-dashboard/exam-assessment-buttons` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exam-assessment-buttons/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exam-assessment-buttons/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exam-assessment-buttons';
  ```
- `src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell';
  ```
- `src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/directives/resizable.directive.ts` ([jhiResizable]): imported by 16 Bootstrap-free units; 1 hit: card-resizable
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `src/main/webapp/app/foundation/feature-toggle/feature-toggle-hide.directive.ts` ([jhiFeatureToggleHide]): imported by 8 Bootstrap-free units; 1 hit: d-none
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` (button[jhi-exercise-action-button]): imported by 8 Bootstrap-free units; 12 hits: btn, btn-outline-primary, btn-sm, btn-primary, btn-secondary, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/textarea/textarea-counter.component.html` (jhi-textarea-counter): imported by 6 Bootstrap-free units; 1 hit: badge
- `src/main/webapp/app/shared-ui/components/buttons/code-button/code-button.component.html` (jhi-code-button): imported by 6 Bootstrap-free units; 34 hits: alert, alert-warning, d-flex, btn-group, btn, btn-primary, btn-sm, dropdown-toggle, dropdown-menu, dropdown-item, align-items-center, btn-secondary, btn-success, d-none, d-md-inline
- `src/main/webapp/app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html` (jhi-feedback-suggestion-badge): imported by 5 Bootstrap-free units; 1 hit: badge
- `src/main/webapp/app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html` (jhi-grading-instruction-link-icon): imported by 5 Bootstrap-free units; 1 hit: text-danger
- `src/main/webapp/app/assessment/manage/complaint-response/complaint-response.component.html` (jhi-complaint-response): imported by 5 Bootstrap-free units; 2 hits: col-12

## assessment — 416 hits, 12 of 37 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/assessment/manage/grading/grading-info-modal/grading-info-modal.component.html` — 1 hit
  - `table`×1 → tum-ui-table / tumUiTable
  - PrimeNG: p-dialog → tum-ui-dialog, pButton → tumUiButton
- `src/main/webapp/app/assessment/shared/info-panel/info-panel.component.html` — 1 hit
  - `src/main/webapp/app/assessment/shared/info-panel/info-panel.scss`: 1 raw colors
- `src/main/webapp/app/assessment/manage/assessment-warning/assessment-warning.component.html` — 2 hits
  - `card-header`×1 → tum-ui-card / tum-ui-panel
  - `text-warning`×1 → text-state-warning
- `src/main/webapp/app/assessment/manage/complaint-response/complaint-response.component.html` — 2 hits
  - `col-12`×2 → col-span-12
  - ng-bootstrap: ngbTooltip
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html` — 2 hits
  - `badge`×2 → tum-ui-tag
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/grading/grading-key/grading-key-table.component.html` — 3 hits
  - `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `src/main/webapp/app/assessment/manage/grading/grading-key-overview/grading-key-overview.scss`: 1 raw colors (shared by 2 units)
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/assessment-complaint-alert/assessment-complaint-alert.component.html` — 4 hits
  - `alert`×2, `alert-info`×2 → tum-ui-message
- `src/main/webapp/app/assessment/overview/complaint-request/complaint-request.component.html` — 5 hits
  - `badge`×2 → tum-ui-tag
  - `bg-success`×1 → bg-state-success
  - `bg-danger`×1 → bg-state-danger
  - `col-12`×1 → col-span-12
  - ng-bootstrap: ngbTooltip
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/feedback-suggestions-banner/feedback-suggestions-banner.component.html` — 6 hits
  - `d-flex`×3 → flex
  - `align-items-center`×3 → items-center
  - PrimeNG: pTooltip → tumUiTooltip, p-message → tum-ui-message
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/rating/rating-list/rating-list.component.html` — 9 hits · route `/course-management/:courseId/ratings`
  - `col-12`×1 → col-span-12
  - `row`×1 → grid grid-cols-12 (or flex)
  - `table-responsive`×1, `table`×1 → tum-ui-table / tumUiTable
  - `btn`×1, `btn-primary`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `d-flex`×1 → flex
  - `justify-content-center`×1 → justify-center
  - PrimeNG: p-paginator → tum-ui-paginator
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html` — 9 hits
  - `btn`×2, `btn-sm`×2, `btn-outline-secondary`×2 → tum-ui-button / tumUiButton
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - `table`×1 → tum-ui-table / tumUiTable
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/assessment-locks/assessment-locks.component.html` — 15 hits · route `/course-management/:courseId/exams/:examId/assessment-locks`
  - `btn`×3, `btn-outline-secondary`×3, `btn-sm`×3 → tum-ui-button / tumUiButton
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-between`×1 → justify-between
  - `col-md-8`×1 → md:col-span-8
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - ng-bootstrap: ngbTooltip
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/manage/list-of-complaints/list-of-complaints.component.html` — 31 hits · route `/course-management/:courseId/complaints`
  - `btn`×3, `btn-primary`×3, `btn-outline-primary`×2, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `text-warning`×2 → text-state-warning
  - `text-success`×2 → text-state-success
  - `col-12`×1 → col-span-12
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - `btn-group`×1, `btn-group-sm`×1 → tum-ui-button-group
  - `spinner-border`×1, `spinner-border-sm`×1 → tum-ui-progress-spinner
  - `form-select`×1 → tum-ui-select
  - `text-muted`×1 → --text-body-secondary
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `row`×1 → grid grid-cols-12 (or flex)
  - `table-responsive`×1, `table`×1 → tum-ui-table / tumUiTable
  - `text-danger`×1 → text-state-danger
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - ng-bootstrap: ngbTooltip
  - 5 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/assessment/overview/complaint-form/complaints-form.component.html` — 15 hits
  - `col-12`×4 → col-span-12
  - `row`×3 → grid grid-cols-12 (or flex)
  - `col-md-6`×2 → md:col-span-6
  - `d-flex`×1 → flex
  - `flex-column`×1 → flex-col
  - `col-6`×1 → col-span-6
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `src/main/webapp/app/assessment/overview/complaints.scss`: 1 raw colors (shared by 2 units)
  - 2 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/shared-ui/textarea/textarea-counter.component.html`
- `src/main/webapp/app/assessment/manage/complaints-for-tutor/complaints-for-tutor.component.html` — 40 hits
  - `col-12`×6 → col-span-12
  - `btn`×4, `btn-success`×2, `btn-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `d-flex`×3 → flex
  - `btn-block`×3 → custom class: rename (banned by prefix only)
  - `alert`×2, `alert-info`×2 → tum-ui-message
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-md-6`×2 → md:col-span-6
  - `badge`×2 → tum-ui-tag
  - `justify-content-center`×1 → justify-center
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `bg-success`×1 → bg-state-success
  - `bg-danger`×1 → bg-state-danger
  - `flex-column`×1 → flex-col
  - `justify-content-between`×1 → justify-between
  - `d-none`×1 → hidden
  - `d-sm-block`×1 → sm:block
  - `justify-content-end`×1 → justify-end
  - 9 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/shared-ui/textarea/textarea-counter.component.html`
- `src/main/webapp/app/assessment/manage/assessment-header/assessment-header.component.html` — 21 hits
  - `btn`×8, `btn-primary`×3, `btn-success`×2, `btn-danger`×2, `btn-info`×1 → tum-ui-button / tumUiButton
  - `d-flex`×2 → flex
  - `text-danger`×2 → text-state-danger
  - `align-items-center`×1 → items-center
  - PrimeNG: p-message → tum-ui-message
  - ng-bootstrap: ngbTooltip
  - 18 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (2 hits): `app/assessment/manage/assessment-warning/assessment-warning.component.html`
- `src/main/webapp/app/assessment/manage/grading/grading-key-overview/grading-key-overview.component.html` — 8 hits · route `/course-management/:courseId/exams/:examId/student-exams/:studentExamId/summary/overview/grading-key`
  - `btn`×2, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-center`×1 → justify-center
  - `col-6`×1 → col-span-6
  - `src/main/webapp/app/assessment/manage/grading/grading-key-overview/grading-key-overview.scss`: 1 raw colors (shared by 2 units)
  - 1 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (3 hits): `app/assessment/manage/grading/grading-key/grading-key-table.component.html`
- `src/main/webapp/app/assessment/manage/grading/grading-presentations/grading-presentations.component.html` — 13 hits
  - `input-group-prepend`×3 → custom class: rename (banned by prefix only)
  - `input-group-text`×3, `input-group`×2 → tum-ui-input-group
  - `form-control`×3 → tumUiInput
  - `form-group`×1 → tum-ui-form-field
  - `row`×1 → grid grid-cols-12 (or flex)
  - imports 1 unit with Bootstrap (5 hits): `app/exercise/mode-picker/mode-picker.component.html`
- `src/main/webapp/app/assessment/manage/unreferenced-feedback-detail/unreferenced-feedback-detail.component.html` — 26 hits
  - `btn`×3, `btn-sm`×2, `btn-success`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `row`×3 → grid grid-cols-12 (or flex)
  - `form-group`×2 → tum-ui-form-field
  - `col-4`×2 → col-span-4
  - `col`×2 → flex-1
  - `form-control`×2 → tumUiInput
  - `card`×1, `card-header`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `text-secondary`×1, `text-dark`×1 → --text-body-secondary
  - `text-success`×1 → text-state-success
  - `text-danger`×1 → text-state-danger
  - `text-warning`×1 → text-state-warning
  - ng-bootstrap: ngbTooltip
  - 6 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (7 hits): `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`, `app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html`
- `src/main/webapp/app/assessment/manage/grading/bonus/bonus.component.html` — 33 hits · route `/course-management/:courseId/exams/:examId/bonus`
  - `row`×5 → grid grid-cols-12 (or flex)
  - `text-warning`×4 → text-state-warning
  - `col-1`×3 → col-span-1
  - `form-group`×3 → tum-ui-form-field
  - `col`×3 → flex-1
  - `text-secondary`×2 → --text-body-secondary
  - `d-flex`×2 → flex
  - `d-block`×2 → block
  - `table`×2, `table-striped`×2 → tum-ui-table / tumUiTable
  - `align-items-baseline`×1 → items-baseline
  - `form-select`×1 → tum-ui-select
  - `align-items-center`×1 → items-center
  - `alert`×1, `alert-warning`×1 → tum-ui-message
  - ng-bootstrap: ngbTooltip
  - 25 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (8 hits): `app/exercise/mode-picker/mode-picker.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/assessment/manage/grading/grading.component.html` — 33 hits · route `/course-management/:courseId/grading`
  - `form-group`×5 → tum-ui-form-field
  - `btn`×4, `btn-danger`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `alert`×4, `alert-info`×2, `alert-warning`×2 → tum-ui-message
  - `form-select`×3 → tum-ui-select
  - `dropdown-container`×2 → custom class: rename (banned by prefix only)
  - `table`×2, `table-striped`×2 → tum-ui-table / tumUiTable
  - `text-warning`×1 → text-state-warning
  - `form-control`×1 → tumUiInput
  - `col-12`×1 → col-span-12
  - ng-bootstrap: ngbTooltip
  - 9 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (22 hits): `app/assessment/manage/grading/grading-info-modal/grading-info-modal.component.html`, `app/assessment/manage/grading/grading-presentations/grading-presentations.component.html`, `app/exercise/mode-picker/mode-picker.component.html`, `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/assessment/overview/complaints-for-students/complaints-student-view.component.html` — 12 hits
  - `btn`×2, `btn-primary`×2 → tum-ui-button / tumUiButton
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-12`×2 → col-span-12
  - `col-md-6`×2 → md:col-span-6
  - `flex-grow-1`×1 → grow
  - `src/main/webapp/app/assessment/overview/complaints.scss`: 1 raw colors (shared by 2 units)
  - 2 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (23 hits): `app/assessment/manage/complaint-response/complaint-response.component.html`, `app/assessment/overview/complaint-form/complaints-form.component.html`, `app/assessment/overview/complaint-request/complaint-request.component.html`, `app/shared-ui/textarea/textarea-counter.component.html`
- `src/main/webapp/app/assessment/manage/assessment-instructions/collapsable-assessment-instructions/collapsable-assessment-instructions.component.html` — 4 hits
  - `card`×1, `card-header`×1, `card-title`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - imports 7 units with Bootstrap (42 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/programming/shared/instructions-render/programming-exercise-instruction.component.html`, `app/programming/shared/instructions-render/step-wizard/programming-exercise-instruction-step-wizard.component.html`, `app/programming/shared/instructions-render/task/programming-exercise-instruction-task-status.component.html`, `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/directives/resizable.directive.ts`
- `src/main/webapp/app/assessment/manage/assessment-layout/assessment-layout.component.html` — 1 hit
  - `row`×1 → grid grid-cols-12 (or flex)
  - 1 Bootstrap spacing classes to convert by size
  - imports 5 units with Bootstrap (68 hits): `app/assessment/manage/assessment-complaint-alert/assessment-complaint-alert.component.html`, `app/assessment/manage/assessment-header/assessment-header.component.html`, `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/assessment/manage/complaints-for-tutor/complaints-for-tutor.component.html`, `app/shared-ui/textarea/textarea-counter.component.html`
- `src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/exercise-assessment-dashboard.component.html` — 122 hits · route `/course-management/:courseId/assessment-dashboard/:exerciseId`
  - `btn`×12, `btn-sm`×7, `btn-primary`×6, `btn-success`×3, `btn-link`×2, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `alert`×10, `alert-info`×7, `alert-warning`×2, `alert-danger`×1 → tum-ui-message
  - `row`×7 → grid grid-cols-12 (or flex)
  - `d-inline-block`×7 → inline-block
  - `col-12`×5 → col-span-12
  - `text-success`×5 → text-state-success
  - `g-0`×4 → gap-0 (convert by size)
  - `col-7`×4 → col-span-7
  - `col-5`×4 → col-span-5
  - `text-warning`×4 → text-state-warning
  - `d-flex`×3 → flex
  - `col-xl-4`×3 → xl:col-span-4
  - `text-secondary`×3 → --text-body-secondary
  - `table-responsive`×3, `table`×3 → tum-ui-table / tumUiTable
  - `d-block`×2 → block
  - `text-danger`×2 → text-state-danger
  - `col-6`×2 → col-span-6
  - `justify-content-between`×1 → justify-between
  - `col-md-7`×1 → md:col-span-7
  - `col-md-5`×1 → md:col-span-5
  - `justify-content-center`×1 → justify-center
  - `justify-content-lg-end`×1 → lg:justify-end
  - `col-lg-7`×1 → lg:col-span-7
  - `bg-success`×1 → bg-state-success
  - `bg-danger`×1 → bg-state-danger
  - `col-md-6`×1 → md:col-span-6
  - `flex-grow-1`×1 → grow
  - PrimeNG: p-message → tum-ui-message, pTooltip → tumUiTooltip
  - ng-bootstrap: ngbTooltip
  - 16 Bootstrap spacing classes to convert by size
  - imports 20 units with Bootstrap (128 hits): `app/assessment/manage/assessment-instructions/collapsable-assessment-instructions/collapsable-assessment-instructions.component.html`, `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/assessment/shared/info-panel/info-panel.component.html`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/exercise/dashboards/tutor-participation-graph/progress-bar/progress-bar.component.html`, `app/exercise/dashboards/tutor-participation-graph/tutor-participation-graph.component.html`, `app/exercise/exercise-categories/exercise-categories.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
