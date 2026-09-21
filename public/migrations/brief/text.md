# Artemis client migration brief: text

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

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/directives/resizable.directive.ts` ([jhiResizable]): imported by 16 Bootstrap-free units; 1 hit: card-resizable
- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `src/main/webapp/app/communication/posting-button/posting-button.component.html` (button[jhi-posting-button]): imported by 10 Bootstrap-free units; 3 hits: btn, btn-outline-primary, btn-sm
- `src/main/webapp/app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html` (jhi-redirect-to-iris-button): imported by 10 Bootstrap-free units; 3 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` (jhi-markdown-editor-monaco): imported by 10 Bootstrap-free units; 4 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/foundation/feature-toggle/feature-toggle-hide.directive.ts` ([jhiFeatureToggleHide]): imported by 8 Bootstrap-free units; 1 hit: d-none
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` (button[jhi-exercise-action-button]): imported by 8 Bootstrap-free units; 12 hits: btn, btn-outline-primary, btn-sm, btn-primary, btn-secondary, d-none, d-md-inline, d-xl-inline

## text — 206 hits, 3 of 16 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/text/manage/assess/textblock-feedback-editor/dropdown/textblock-feedback-dropdown.component.html` — 3 hits
  - `dropdown-item`×1 → tum-ui-menu
  - `table`×1 → tum-ui-table / tumUiTable
  - `src/main/webapp/app/text/manage/assess/textblock-feedback-editor/dropdown/textblock-feedback-dropdown.component.scss`: 1 --bs-* variables
- `src/main/webapp/app/text/manage/assess/manual-text-selection/manual-text-selection.component.html` — 9 hits
  - `src/main/webapp/app/text/manage/assess/manual-text-selection/manual-text-selection.component.scss`: 9 raw colors
- `src/main/webapp/app/text/manage/tutor-effort/tutor-effort-statistics.component.html` — 17 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId/tutor-effort-statistics`
  - `d-flex`×4 → flex
  - `justify-content-center`×3 → justify-center
  - `align-items-center`×2 → items-center
  - `justify-content-between`×1 → justify-between
  - `btn`×1, `btn-primary`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `table`×1 → tum-ui-table / tumUiTable
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-10`×1 → col-span-10
  - `src/main/webapp/app/text/manage/tutor-effort/tutor-effort-statistics.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/text/manage/text-exercise/row-buttons/text-exercise-row-buttons.component.html` — 26 hits
  - `btn`×5, `btn-sm`×5, `btn-primary`×2, `btn-info`×1, `btn-success`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `d-none`×5 → hidden
  - `d-md-inline`×5 → md:inline
  - `btn-group`×1 → tum-ui-button-group
  - 5 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (3 hits): `app/shared-ui/delete-dialog/directive/delete-button.directive.ts`
- `src/main/webapp/app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.html` — 38 hits
  - `form-group`×5 → tum-ui-form-field
  - `col-md-1`×3 → md:col-span-1
  - `row`×2 → grid grid-cols-12 (or flex)
  - `col-md-10`×2 → md:col-span-10
  - `d-inline`×2 → inline
  - `dropdown-menu`×2, `dropdown-item`×2, `dropdown`×1, `dropdown-toggle`×1 → tum-ui-menu
  - `form-control`×2 → tumUiInput
  - `alert`×1, `alert-dismissible`×1, `alert-secondary`×1, `alert-success`×1, `alert-danger`×1 → tum-ui-message
  - `close`×1 → tum-ui-button
  - `text-secondary`×1 → --text-body-secondary
  - `input-group`×1 → tum-ui-input-group
  - `input-group-prepend`×1, `dropdown-submenu`×1 → custom class: rename (banned by prefix only)
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `text-success`×1 → text-state-success
  - `text-danger`×1 → text-state-danger
  - `text-warning`×1 → text-state-warning
  - ng-bootstrap: ngbTooltip, ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - `src/main/webapp/app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.scss`: 1 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size
  - imports 5 units with Bootstrap (8 hits): `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/shared-ui/confirm-icon/confirm-icon.component.html`, `app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html`, `app/text/manage/assess/textblock-feedback-editor/dropdown/textblock-feedback-dropdown.component.html`
- `src/main/webapp/app/text/manage/example-text-submission/resizable-instructions/resizable-instructions.component.html` — 3 hits
  - `card-header`×1, `card-title`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - imports 1 unit with Bootstrap (9 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`
- `src/main/webapp/app/text/manage/assess/textblock-assessment-card/text-block-assessment-card.component.html` — 3 hits
  - `src/main/webapp/app/text/manage/assess/textblock-assessment-card/text-block-assessment-card.component.scss`: 3 Bootstrap Sass imports
  - imports 6 units with Bootstrap (46 hits): `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/shared-ui/confirm-icon/confirm-icon.component.html`, `app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html`, `app/text/manage/assess/textblock-feedback-editor/dropdown/textblock-feedback-dropdown.component.html`, `app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.html`
- `src/main/webapp/app/text/manage/assess/text-assessment-area/text-assessment-area.component.html` — 2 hits
  - `badge`×2 → tum-ui-tag
  - 2 Bootstrap spacing classes to convert by size
  - imports 8 units with Bootstrap (58 hits): `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/shared-ui/confirm-icon/confirm-icon.component.html`, `app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html`, `app/text/manage/assess/manual-text-selection/manual-text-selection.component.html`, `app/text/manage/assess/textblock-assessment-card/text-block-assessment-card.component.html`, `app/text/manage/assess/textblock-feedback-editor/dropdown/textblock-feedback-dropdown.component.html`, `app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.html`
- `src/main/webapp/app/text/overview/text-editor/text-editor.component.html` — 23 hits · route `/courses/:courseId/:dynamic/text-exercises/:exerciseId/participate/:participationId`
  - `col-xl-8`×4 → xl:col-span-8
  - `badge`×3 → tum-ui-tag
  - `col-md-12`×3 → md:col-span-12
  - `col-lg-10`×3 → lg:col-span-10
  - `row`×2 → grid grid-cols-12 (or flex)
  - `w-100`×1 → w-full
  - `bg-warning`×1 → bg-state-warning
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - `src/main/webapp/app/text/overview/text-editor/text-editor.component.scss`: 1 raw colors, 3 Bootstrap Sass imports
  - 7 Bootstrap spacing classes to convert by size
  - imports 11 units with Bootstrap (87 hits): `app/assessment/manage/complaint-response/complaint-response.component.html`, `app/assessment/overview/complaint-form/complaints-form.component.html`, `app/assessment/overview/complaint-request/complaint-request.component.html`, `app/assessment/overview/complaints-for-students/complaints-student-view.component.html`, `app/exercise/team/team-participate/team-participate-info-box.component.html`, `app/exercise/team/team-participate/team-students-online-list.component.html`, `app/shared-ui/connection-status/connection-status.component.html`, `app/shared-ui/directives/resizable.directive.ts`, …
- `src/main/webapp/app/text/manage/example-text-submission/example-text-submission.component.html` — 40 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId/example-submissions/:exampleSubmissionId`
  - `btn`×9, `btn-primary`×6, `btn-check`×2, `btn-outline-secondary`×2, `btn-success`×1 → tum-ui-button / tumUiButton
  - `col-12`×3 → col-span-12
  - `alert`×2, `alert-info`×2 → tum-ui-message
  - `col-3`×2 → col-span-3
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-between`×1 → justify-between
  - `col-6`×1 → col-span-6
  - `col`×1 → flex-1
  - `col-4`×1 → col-span-4
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - `justify-content-end`×1 → justify-end
  - `btn-group`×1 → tum-ui-button-group
  - `src/main/webapp/app/text/manage/example-text-submission/example-text-submission.component.scss`: 2 raw colors
  - 14 Bootstrap spacing classes to convert by size
  - imports 19 units with Bootstrap (141 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/assessment/manage/unreferenced-feedback-detail/unreferenced-feedback-detail.component.html`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/programming/shared/instructions-render/programming-exercise-instruction.component.html`, `app/programming/shared/instructions-render/step-wizard/programming-exercise-instruction-step-wizard.component.html`, `app/programming/shared/instructions-render/task/programming-exercise-instruction-task-status.component.html`, …
- `src/main/webapp/app/text/manage/assess/submission-assessment/text-submission-assessment.component.html` — 12 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId/:dynamic`
  - `row`×2 → grid grid-cols-12 (or flex)
  - `alert`×2, `alert-info`×1, `alert-warning`×1 → tum-ui-message
  - `col-12`×1 → col-span-12
  - `btn`×1, `btn-info`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - 5 Bootstrap spacing classes to convert by size
  - imports 26 units with Bootstrap (216 hits): `app/assessment/manage/assessment-complaint-alert/assessment-complaint-alert.component.html`, `app/assessment/manage/assessment-header/assessment-header.component.html`, `app/assessment/manage/assessment-layout/assessment-layout.component.html`, `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/assessment/manage/complaints-for-tutor/complaints-for-tutor.component.html`, `app/assessment/manage/feedback-suggestions-banner/feedback-suggestions-banner.component.html`, `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, …
- `src/main/webapp/app/text/manage/detail/text-exercise-detail.component.html` — 7 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId`
  - `d-flex`×2 → flex
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-center`×1 → justify-center
  - `col-md-8`×1 → md:col-span-8
  - `align-items-center`×1 → items-center
  - `justify-content-around`×1 → justify-around
  - 1 Bootstrap spacing classes to convert by size
  - imports 31 units with Bootstrap (235 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/exercise/exercise-detail-common-actions/non-programming-exercise-detail-common-actions.component.html`, `app/exercise/statistics/doughnut-chart/doughnut-chart.component.html`, `app/exercise/statistics/exercise-detail-statistic/exercise-detail-statistics.component.html`, `app/foundation/feature-toggle/feature-toggle-hide.directive.ts`, `app/programming/manage/build-plan-editor/build-phases-editor/build-phase/build-phase-editor.component.html`, …
- `src/main/webapp/app/text/manage/text-exercise/update/text-exercise-update.component.html` — 23 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/new`
  - `form-group`×9, `form-control-label`×6 → tum-ui-form-field
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - ng-bootstrap: NgbModal
  - 6 Bootstrap spacing classes to convert by size
  - imports 24 units with Bootstrap (258 hits): `app/atlas/shared/competency-selection/competency-selection.component.html`, `app/communication/posting-button/posting-button.component.html`, `app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html`, `app/course/manage/exercises/group-edit-modal/exercise-group-edit-modal.component.html`, `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exercise/category-selector-primeng/category-selector-primeng.component.html`, `app/exercise/difficulty-picker/difficulty-picker.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
