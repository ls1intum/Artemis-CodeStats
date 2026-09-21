# Artemis client migration brief: fileupload

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

## fileupload — 72 hits, 0 of 4 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/fileupload/overview/file-upload-submission/file-upload-submission.component.html` — 19 hits · route `/courses/:courseId/:dynamic/file-upload-exercises/:exerciseId/participate/:participationId`
  - `row`×3 → grid grid-cols-12 (or flex)
  - `d-inline-block`×2 → inline-block
  - `badge`×2 → tum-ui-tag
  - `bg-info`×2 → bg-state-info
  - `w-100`×1 → w-full
  - `col-12`×1 → col-span-12
  - `col-md-6`×1 → md:col-span-6
  - `form-group`×1, `form-control-label`×1 → tum-ui-form-field
  - `input-group`×1 → tum-ui-input-group
  - `card-text`×1 → tum-ui-card / tum-ui-panel
  - `col-xl-8`×1 → xl:col-span-8
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - 7 Bootstrap spacing classes to convert by size
  - imports 9 units with Bootstrap (88 hits): `app/assessment/manage/complaint-response/complaint-response.component.html`, `app/assessment/overview/complaint-form/complaints-form.component.html`, `app/assessment/overview/complaint-request/complaint-request.component.html`, `app/assessment/overview/complaints-for-students/complaints-student-view.component.html`, `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html`, `app/shared-ui/directives/resizable.directive.ts`, `app/shared-ui/resizeable-container/resizeable-container.component.html`, `app/shared-ui/textarea/textarea-counter.component.html`, …
- `src/main/webapp/app/fileupload/manage/assess/file-upload-assessment.component.html` — 17 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/file-upload-exercises/:exerciseId/submissions/:submissionId/assessment`
  - `col-12`×2 → col-span-12
  - `row`×2 → grid grid-cols-12 (or flex)
  - `alert`×2, `alert-danger`×1, `alert-warning`×1 → tum-ui-message
  - `card-text`×1 → tum-ui-card / tum-ui-panel
  - `badge`×1 → tum-ui-tag
  - `bg-info`×1 → bg-state-info
  - `col-8`×1 → col-span-8
  - `btn`×1, `btn-info`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - 5 Bootstrap spacing classes to convert by size
  - imports 19 units with Bootstrap (154 hits): `app/assessment/manage/assessment-complaint-alert/assessment-complaint-alert.component.html`, `app/assessment/manage/assessment-header/assessment-header.component.html`, `app/assessment/manage/assessment-layout/assessment-layout.component.html`, `app/assessment/manage/assessment-warning/assessment-warning.component.html`, `app/assessment/manage/complaints-for-tutor/complaints-for-tutor.component.html`, `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/assessment/manage/unreferenced-feedback-detail/unreferenced-feedback-detail.component.html`, …
- `src/main/webapp/app/fileupload/manage/update/file-upload-exercise-update.component.html` — 29 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/file-upload-exercises/new`
  - `form-group`×10, `form-control-label`×9 → tum-ui-form-field
  - `form-control`×3 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - `text-secondary`×1 → --text-body-secondary
  - ng-bootstrap: NgbModal, ngbTooltip
  - 6 Bootstrap spacing classes to convert by size
  - imports 22 units with Bootstrap (202 hits): `app/atlas/shared/competency-selection/competency-selection.component.html`, `app/communication/posting-button/posting-button.component.html`, `app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html`, `app/course/manage/exercises/group-edit-modal/exercise-group-edit-modal.component.html`, `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exercise/category-selector-primeng/category-selector-primeng.component.html`, `app/exercise/difficulty-picker/difficulty-picker.component.html`, …
- `src/main/webapp/app/fileupload/manage/exercise-details/file-upload-exercise-detail.component.html` — 7 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/file-upload-exercises/:exerciseId`
  - `d-flex`×2 → flex
  - `row`×1 → grid grid-cols-12 (or flex)
  - `justify-content-center`×1 → justify-center
  - `col-md-8`×1 → md:col-span-8
  - `align-items-center`×1 → items-center
  - `justify-content-around`×1 → justify-around
  - 1 Bootstrap spacing classes to convert by size
  - imports 31 units with Bootstrap (235 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/exercise/exercise-detail-common-actions/non-programming-exercise-detail-common-actions.component.html`, `app/exercise/statistics/doughnut-chart/doughnut-chart.component.html`, `app/exercise/statistics/exercise-detail-statistic/exercise-detail-statistics.component.html`, `app/foundation/feature-toggle/feature-toggle-hide.directive.ts`, `app/programming/manage/build-plan-editor/build-phases-editor/build-phase/build-phase-editor.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
