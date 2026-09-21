# Artemis client migration brief

> Bootstrap → Tailwind / TUM UI. Generated from Artemis `5be30e1d` (Development: Improve input validation for assessment feedback and text block ids (#13917), https://github.com/ls1intum/Artemis/pull/13917). Hits are class tokens matched by Artemis's own `no-bootstrap-classes` rule plus SCSS residue; a unit is done when its directory is in the lock list. Guideline: https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/guidelines/client-development.mdx

## Status

- 9123 Bootstrap hits in 584 of 1004 units; 137 units locked, 283 Bootstrap-free but unlocked
- 50 of 217 routed pages import no Bootstrap
- 80 directories can be locked now (configuration-only change)

## How to migrate a unit

1. Convert the whole rendering closure, never half: replace Bootstrap classes with the targets below, PrimeNG with the TUM UI kit component where one exists, and raw colors with semantic tokens (`text-state-*`, `--text-body-secondary`).
2. Convert spacing by size, not by name. Delete component SCSS that only restyled Bootstrap.
3. When a directory has zero hits and imports nothing with hits, add it to the three lock lists (`eslint.config.mjs`, `.stylelintrc.json`, `tailwind.css`) and run `pnpm run test:rules && pnpm run lint && pnpm run stylelint`.

## Lock now

- `app/tutorialgroup/manage/holidays` (4 units)
  ```
  'src/main/webapp/app/tutorialgroup/manage/holidays/**/*.html',
  "src/main/webapp/app/tutorialgroup/manage/holidays/**/*.scss",
  @source './app/tutorialgroup/manage/holidays';
  ```
- `app/lti/overview` (3 units)
  ```
  'src/main/webapp/app/lti/overview/**/*.html',
  "src/main/webapp/app/lti/overview/**/*.scss",
  @source './app/lti/overview';
  ```
- `app/communication/emoji` (2 units)
  ```
  'src/main/webapp/app/communication/emoji/**/*.html',
  "src/main/webapp/app/communication/emoji/**/*.scss",
  @source './app/communication/emoji';
  ```
- `app/exercise/review` (2 units)
  ```
  'src/main/webapp/app/exercise/review/**/*.html',
  "src/main/webapp/app/exercise/review/**/*.scss",
  @source './app/exercise/review';
  ```
- `app/plagiarism/manage/plagiarism-run-details` (2 units)
  ```
  'src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.html',
  "src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.scss",
  @source './app/plagiarism/manage/plagiarism-run-details';
  ```
- `app/assessment/manage/assessment-instructions/expandable-section` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-instructions/expandable-section/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-instructions/expandable-section/**/*.scss",
  @source './app/assessment/manage/assessment-instructions/expandable-section';
  ```
- `app/assessment/manage/assessment-note` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-note/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-note/**/*.scss",
  @source './app/assessment/manage/assessment-note';
  ```
- `app/assessment/manage/assessment-workspace` (1 unit)
  ```
  'src/main/webapp/app/assessment/manage/assessment-workspace/**/*.html',
  "src/main/webapp/app/assessment/manage/assessment-workspace/**/*.scss",
  @source './app/assessment/manage/assessment-workspace';
  ```
- `app/assessment/shared/assessment-dashboard/exam-assessment-buttons` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exam-assessment-buttons/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exam-assessment-buttons/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exam-assessment-buttons';
  ```
- `app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exercise-dashboard/language-table-cell';
  ```
- `app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button` (1 unit)
  ```
  'src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button/**/*.html',
  "src/main/webapp/app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button/**/*.scss",
  @source './app/assessment/shared/assessment-dashboard/exercise-dashboard/second-correction-button';
  ```
- `app/atlas/manage/taxonomy-select` (1 unit)
  ```
  'src/main/webapp/app/atlas/manage/taxonomy-select/**/*.html',
  "src/main/webapp/app/atlas/manage/taxonomy-select/**/*.scss",
  @source './app/atlas/manage/taxonomy-select';
  ```
- `app/atlas/shared/competency-rings` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/competency-rings/**/*.html',
  "src/main/webapp/app/atlas/shared/competency-rings/**/*.scss",
  @source './app/atlas/shared/competency-rings';
  ```
- `app/atlas/shared/dag-graph` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/dag-graph/**/*.html',
  "src/main/webapp/app/atlas/shared/dag-graph/**/*.scss",
  @source './app/atlas/shared/dag-graph';
  ```
- `app/atlas/shared/orchestration-result-dialog` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/orchestration-result-dialog/**/*.html',
  "src/main/webapp/app/atlas/shared/orchestration-result-dialog/**/*.scss",
  @source './app/atlas/shared/orchestration-result-dialog';
  ```
- `app/calendar/desktop/month-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/desktop/month-presentation/**/*.html',
  "src/main/webapp/app/calendar/desktop/month-presentation/**/*.scss",
  @source './app/calendar/desktop/month-presentation';
  ```
- `app/calendar/desktop/week-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/desktop/week-presentation/**/*.html',
  "src/main/webapp/app/calendar/desktop/week-presentation/**/*.scss",
  @source './app/calendar/desktop/week-presentation';
  ```
- `app/calendar/mobile/month-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/mobile/month-presentation/**/*.html',
  "src/main/webapp/app/calendar/mobile/month-presentation/**/*.scss",
  @source './app/calendar/mobile/month-presentation';
  ```
- `app/calendar/shared/calendar-day-badge` (1 unit)
  ```
  'src/main/webapp/app/calendar/shared/calendar-day-badge/**/*.html',
  "src/main/webapp/app/calendar/shared/calendar-day-badge/**/*.scss",
  @source './app/calendar/shared/calendar-day-badge';
  ```
- `app/calendar/shared/calendar-event-detail-popover-component` (1 unit)
  ```
  'src/main/webapp/app/calendar/shared/calendar-event-detail-popover-component/**/*.html',
  "src/main/webapp/app/calendar/shared/calendar-event-detail-popover-component/**/*.scss",
  @source './app/calendar/shared/calendar-event-detail-popover-component';
  ```
- … 60 more directories in the JSON brief

## Shared units to fix first

- `app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `app/shared-ui/directives/resizable.directive.ts` ([jhiResizable]): imported by 16 Bootstrap-free units; 1 hit: card-resizable
- `app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `app/communication/posting-button/posting-button.component.html` (button[jhi-posting-button]): imported by 10 Bootstrap-free units; 3 hits: btn, btn-outline-primary, btn-sm
- `app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html` (jhi-redirect-to-iris-button): imported by 10 Bootstrap-free units; 3 hits: btn, btn-sm, btn-outline-secondary
- `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` (jhi-markdown-editor-monaco): imported by 10 Bootstrap-free units; 4 hits: btn, btn-sm, btn-outline-secondary
- `app/foundation/feature-toggle/feature-toggle-hide.directive.ts` ([jhiFeatureToggleHide]): imported by 8 Bootstrap-free units; 1 hit: d-none

## course — 984 hits, 24 of 84 units Bootstrap-free

- `app/course/manage/update/course-update.component.html` — 111 hits, 24 in imported units
  - `form-group`×21, `form-text`×3 → tum-ui-form-field
  - `form-control-label`×21, `form-control`×3 → tumUiInput
  - `text-secondary`×20, `text-muted`×2 → --text-body-secondary
  - `row`×8, `col-md`×6, `col`×4, `col-xl`×4, `g-2`×2, `col-md-8`×1, `col-2`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-check`×3, `form-check-input`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `form-select`×2 → tum-ui-select
  - `justify-content-center`×1 → justify-*
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - `d-block`×1, `d-flex`×1 → flex / block / grid / inline-block
  - `app/course/manage/update/course-update.component.scss`: 1 --bs-* variables, 1 raw colors
  - 31 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/course/manage/onboarding/pages/onboarding-assessment-ai.component.html` — 74 hits
  - `form-label`×6 → tum-ui-form-field
  - `form-control`×6 → tumUiInput
  - `text-muted`×4 → --text-body-secondary
  - `alert`×3, `alert-danger`×3 → tum-ui-message
  - `col-md-4`×3, `row`×2, `g-3`×2, `col-md-6`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×2 → flex / block / grid / inline-block
  - `align-items-center`×2, `align-items-end`×1 → items-*
  - `app/course/manage/onboarding/pages/_onboarding-pages.scss`: 20 --bs-* variables, 18 raw colors (shared by 5 units)
  - 17 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/course/manage/onboarding/pages/onboarding-general-settings.component.html` — 65 hits, 18 in imported units
  - `row`×5, `col-md-6`×5, `g-3`×2, `col`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-label`×5 → tum-ui-form-field
  - `form-select`×3 → tum-ui-select
  - `text-muted`×3 → --text-body-secondary
  - `form-control`×1 → tumUiInput
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `app/course/manage/onboarding/pages/_onboarding-pages.scss`: 20 --bs-* variables, 18 raw colors (shared by 5 units)
  - 15 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/course/manage/onboarding/pages/onboarding-enrollment.component.html` — 55 hits, 12 in imported units
  - `text-muted`×6 → --text-body-secondary
  - `d-flex`×3 → flex / block / grid / inline-block
  - `align-items-center`×3 → items-*
  - `col-md-6`×2, `row`×1, `g-3`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-label`×1 → tum-ui-form-field
  - `app/course/manage/onboarding/pages/_onboarding-pages.scss`: 20 --bs-* variables, 18 raw colors (shared by 5 units)
  - 18 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/course/manage/onboarding/pages/onboarding-communication.component.html` — 48 hits, 12 in imported units
  - `text-muted`×5 → --text-body-secondary
  - `d-flex`×2 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `form-label`×1 → tum-ui-form-field
  - `app/course/manage/onboarding/pages/_onboarding-pages.scss`: 20 --bs-* variables, 18 raw colors (shared by 5 units)
  - 11 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/course/sidebar/sidebar-card-item/sidebar-card-item.component.html` — 45 hits, 24 in imported units
  - `text-truncate`×14 → truncate
  - `d-flex`×9, `d-inline`×1 → flex / block / grid / inline-block
  - `align-items-baseline`×9 → items-*
  - `flex-column`×5 → flex-col
  - `justify-content-between`×4 → justify-*
  - `app/course/sidebar/sidebar-card-item/sidebar-card-item.component.scss`: 3 --bs-* variables
  - 21 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 54 more units in the detail JSON

## programming — 981 hits, 32 of 110 units Bootstrap-free

- `app/programming/manage/assess/code-editor-tutor-assessment-inline-feedback/code-editor-tutor-assessment-inline-feedback.component.html` — 59 hits, 7 in imported units
  - `form-group`×5 → tum-ui-form-field
  - `d-inline`×5, `d-flex`×2 → flex / block / grid / inline-block
  - `btn`×4, `btn-sm`×4, `btn-primary`×2, `btn-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `row`×3, `col`×3, `col-8`×2, `col-3`×2, `col-1`×1, `col-10`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `align-items-start`×3 → items-*
  - `text-secondary`×2 → --text-body-secondary
  - `form-control`×2 → tumUiInput
  - `flex-grow-0`×2, `flex-grow-1`×1, `flex-shrink-1`×1 → grow / shrink
  - `justify-content-end`×2 → justify-*
  - `alert`×1, `alert-success`×1, `alert-danger`×1, `alert-warning`×1, `alert-info`×1, `alert-secondary`×1 → tum-ui-message
  - `badge`×1 → tum-ui-tag
  - `bg-success`×1, `bg-danger`×1, `bg-warning`×1 → text-state-* / bg-state-* / border-state-*
  - ng-bootstrap: ngbTooltip
  - 25 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/programming/manage/code-editor/instructor-and-editor-container/code-editor-instructor-and-editor-container.component.html` — 57 hits, 319 in imported units
  - `d-flex`×11, `d-inline-block`×1 → flex / block / grid / inline-block
  - `align-items-center`×7 → items-*
  - `flex-grow-1`×4, `flex-shrink-1`×3 → grow / shrink
  - `text-danger`×3, `text-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `w-100`×3, `h-100`×2 → w-full / h-full or an explicit size
  - `card-body`×2, `card`×1 → tum-ui-card / tum-ui-panel
  - `btn-group`×2 → tum-ui-button-group
  - `justify-content-between`×2, `justify-content-end`×1, `justify-content-center`×1 → justify-*
  - `text-body-secondary`×2, `text-muted`×2 → --text-body-secondary
  - `modal-header`×1, `modal-title`×1, `modal-body`×1 → tum-ui-dialog
  - `btn-close`×1, `btn`×1, `btn-outline-primary`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-sm-inline`×1 → md:flex / md:hidden …
  - `flex-column`×1 → flex-col
  - PrimeNG: pButton → tumUiButton, p-badge, p-popover → tum-ui-popover, pTooltip → tumUiTooltip, p-checkbox → tum-ui-checkbox, pTextarea → tumUiTextarea, p-message → tum-ui-message
  - ng-bootstrap: NgbModal, ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbTooltip
  - 44 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/programming/manage/detail/programming-exercise-detail.component.html` — 50 hits, 229 in imported units
  - `btn`×13, `btn-sm`×13, `btn-info`×5, `btn-warning`×4, `btn-primary`×2, `btn-secondary`×1, `btn-outline-primary`×1 → tum-ui-button / tumUiButton
  - `d-flex`×3 → flex / block / grid / inline-block
  - `row`×1, `col-md-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-center`×1, `justify-content-around`×1 → justify-*
  - `align-items-center`×1 → items-*
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:flex / md:hidden …
  - ng-bootstrap: ngbTooltip
  - `app/programming/manage/detail/programming-exercise-detail.component.scss`: 1 raw colors
  - 9 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/programming/manage/grading/feedback-analysis/modal/feedback-detail-channel/feedback-detail-channel-modal.component.html` — 40 hits, 9 in imported units
  - `btn`×6, `btn-check`×4, `btn-outline-secondary`×4, `btn-primary`×2, `btn-close`×1 → tum-ui-button / tumUiButton
  - `form-group`×5 → tum-ui-form-field
  - `alert`×3, `alert-danger`×2, `alert-info`×1 → tum-ui-message
  - `text-muted`×2 → --text-body-secondary
  - `form-control`×2 → tumUiInput
  - `btn-group`×2 → tum-ui-button-group
  - `modal-header`×1, `modal-title`×1, `modal-body`×1 → tum-ui-dialog
  - `text-info`×1 → text-state-* / bg-state-* / border-state-*
  - `d-flex`×1 → flex / block / grid / inline-block
  - `justify-content-end`×1 → justify-*
  - ng-bootstrap: NgbActiveModal, NgbModal
  - 8 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/programming/manage/grading/feedback-analysis/feedback-analysis.component.html` — 34 hits, 143 in imported units
  - `d-flex`×6 → flex / block / grid / inline-block
  - `align-items-center`×6, `align-items-end`×1 → items-*
  - `text-muted`×2 → --text-body-secondary
  - `row`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-between`×2, `justify-content-center`×2 → justify-*
  - `form-switch`×1 → no guideline target
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `btn-warning`×1, `btn`×1, `btn-success`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `form-control`×1 → tumUiInput
  - `table`×1, `table-striped`×1, `table-group-divider`×1 → tum-ui-table / tumUiTable
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `flex-column`×1 → flex-col
  - PrimeNG: p-paginator → tum-ui-paginator
  - ng-bootstrap: NgbModal, ngbTooltip
  - 17 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/programming/manage/grading/configure-status/programming-exercise-configure-grading-status.component.ts` — 33 hits
  - `d-flex`×9 → flex / block / grid / inline-block
  - `align-items-center`×8 → items-*
  - `badge`×8 → tum-ui-tag
  - `bg-success`×4, `bg-warning`×2 → text-state-* / bg-state-* / border-state-*
  - `flex-column`×1 → flex-col
  - `justify-content-between`×1 → justify-*
  - ng-bootstrap: ngbTooltip
  - 21 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 72 more units in the detail JSON

## exercise — 910 hits, 34 of 96 units Bootstrap-free

- `app/exercise/team/teams-import-dialog/teams-import-dialog.component.html` — 74 hits, 9 in imported units
  - `d-flex`×11 → flex / block / grid / inline-block
  - `btn`×5, `btn-primary`×2, `btn-default`×2, `btn-warning`×2, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `form-group`×5 → tum-ui-form-field
  - `list-group-item--teams`×5, `list-group-item-container`×2, `list-group-item-index`×2, `list-group-item`×2, `list-group`×1, `list-group--teams`×1 → tum-ui-list
  - `text-danger`×4, `bg-danger`×1, `bg-success`×1 → text-state-* / bg-state-* / border-state-*
  - `align-items-end`×3, `align-items-center`×2, `align-items-start`×2 → items-*
  - `text-body-secondary`×3 → --text-body-secondary
  - `badge`×2 → tum-ui-tag
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `row`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-center`×1, `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `card-header`×1 → tum-ui-card / tum-ui-panel
  - `btn-group`×1 → tum-ui-button-group
  - `flex-column`×1 → flex-col
  - `flex-shrink-0`×1, `flex-grow-1`×1 → grow / shrink
  - `app/exercise/team/teams-import-dialog/teams-import-dialog.component.scss`: 1 --bs-* variables, 3 raw colors
  - 30 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exercise/synchronization/metadata/exercise-metadata-conflict-modal.component.html` — 69 hits, 1 in imported units
  - `d-flex`×11 → flex / block / grid / inline-block
  - `col-12`×10, `col-md-6`×10, `row`×5, `g-3`×5 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `h-100`×10 → w-full / h-full or an explicit size
  - `text-body-secondary`×10 → --text-body-secondary
  - `justify-content-between`×4, `justify-content-end`×1 → justify-*
  - `flex-column`×3 → flex-col
  - PrimeNG: p-button → tum-ui-button, p-table → tum-ui-table
  - 47 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exercise/structured-grading-criterion/grading-instructions-details/grading-instructions-details.component.html` — 66 hits, 12 in imported units
  - `form-control`×7, `form-control-label`×1 → tumUiInput
  - `btn`×6, `btn-block`×5, `btn-secondary`×2, `btn-default`×2, `btn-danger`×2, `btn-success`×2, `btn-md`×1 → tum-ui-button / tumUiButton
  - `row`×4, `col-12`×3, `col-sm-6`×3, `col-md-auto`×3, `col-xl-3`×2, `col-md-8`×2, `col-sm-auto`×1, `col-md-9`×1, `col-sm-2`×1, `col-md-3`×1, `col-2`×1, `col-md-10`×1, `col-md-4`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×3 → flex / block / grid / inline-block
  - `input-group-btn`×3, `input-group`×1 → tum-ui-input-group
  - `align-items-center`×2 → items-*
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `form-group`×1 → tum-ui-form-field
  - ng-bootstrap: ngbTooltip
  - `app/exercise/structured-grading-criterion/grading-instructions-details/grading-instructions-details.component.scss`: 1 raw colors
  - 19 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exercise/team/team-update-dialog/team-update-dialog.component.html` — 55 hits, 2 in imported units
  - `text-danger`×9 → text-state-* / bg-state-* / border-state-*
  - `d-flex`×7 → flex / block / grid / inline-block
  - `form-group`×4 → tum-ui-form-field
  - `align-items-center`×4, `align-items-end`×2 → items-*
  - `form-control`×2, `form-control-error`×2 → tumUiInput
  - `list-group-item-container`×2, `list-group-item-index`×2, `list-group-item`×2, `list-group`×1, `list-group--students`×1, `list-group-item-error`×1 → tum-ui-list
  - `text-body-secondary`×2 → --text-body-secondary
  - `btn`×2, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `alert`×1, `alert-info`×1, `alert-warning`×1 → tum-ui-message
  - `justify-content-between`×1 → justify-*
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `app/exercise/team/team-update-dialog/team-update-dialog.component.scss`: 1 --bs-* variables
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exercise/exercise-detail-common-actions/non-programming-exercise-detail-common-actions.component.html` — 47 hits, 4 in imported units
  - `btn`×10, `btn-sm`×10, `btn-info`×4, `btn-warning`×2, `btn-primary`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `d-none`×8 → hidden
  - `d-md-inline`×8 → md:flex / md:hidden …
  - `d-flex`×1 → flex / block / grid / inline-block
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exercise/exercise-scores/exercise-scores.component.html` — 44 hits, 170 in imported units
  - `btn`×8, `btn-sm`×7, `btn-primary`×5, `btn-info`×3 → tum-ui-button / tumUiButton
  - `d-none`×6 → hidden
  - `d-md-inline`×4, `d-xl-inline`×2 → md:flex / md:hidden …
  - `d-flex`×3, `d-inline-block`×1 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `flex-column`×1 → flex-col
  - `h-100`×1 → w-full / h-full or an explicit size
  - `btn-group`×1 → tum-ui-button-group
  - PrimeNG: pTooltip → tumUiTooltip
  - ng-bootstrap: ngbPopover
  - 11 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 56 more units in the detail JSON

## exam — 906 hits, 21 of 86 units Bootstrap-free

- `app/exam/manage/exams/update/exam-update.component.html` — 78 hits, 100 in imported units
  - `form-check-label`×11, `form-check`×2, `form-check-input`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `form-control`×9 → tumUiInput
  - `form-group`×8, `invalid-feedback`×1 → tum-ui-form-field
  - `col-sm-6`×8, `row`×7, `col-sm-4`×3, `col`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `alert`×6, `alert-danger`×6 → tum-ui-message
  - `text-danger`×4, `text-warning`×2, `bg-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `btn`×2, `btn-outline-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `justify-content-center`×1 → justify-*
  - `d-inline-flex`×1 → flex / block / grid / inline-block
  - `badge`×1 → tum-ui-tag
  - PrimeNG: p-dialog → tum-ui-dialog
  - ng-bootstrap: ngbTooltip
  - 25 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exam/manage/exams/exam-checklist-component/exam-checklist.component.html` — 72 hits, 78 in imported units
  - `list-group-item`×18 → tum-ui-list
  - `btn`×16, `btn-info`×7, `btn-primary`×6, `btn-warning`×3 → tum-ui-button / tumUiButton
  - `table-responsive`×4, `table`×4, `table-striped`×4 → tum-ui-table / tumUiTable
  - `spinner-border`×4, `spinner-border-sm`×4 → tum-ui-progress-spinner
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:flex / md:hidden …
  - 6 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exam/overview/exam-cover/exam-participation-cover.component.html` — 50 hits, 44 in imported units
  - `row`×6 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `alert`×5, `alert-danger`×4, `alert-info`×1 → tum-ui-message
  - `d-flex`×4, `d-inline-flex`×2 → flex / block / grid / inline-block
  - `form-group`×4 → tum-ui-form-field
  - `align-items-center`×3 → items-*
  - `btn`×3, `btn-primary`×2, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `justify-content-between`×2, `justify-content-end`×1 → justify-*
  - `form-check-input`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `form-control`×2 → tumUiInput
  - `text-danger`×2 → text-state-* / bg-state-* / border-state-*
  - `text-secondary`×1 → --text-body-secondary
  - `app/exam/overview/exam-cover/exam-participation-cover.scss`: 3 raw colors
  - 46 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exam/manage/exam-scores/exam-scores.component.html` — 40 hits, 47 in imported units
  - `form-check`×4, `form-check-input`×4, `form-check-label`×4 → tum-ui-checkbox / tum-ui-radio-button
  - `d-flex`×3, `d-block`×1 → flex / block / grid / inline-block
  - `justify-content-center`×3 → justify-*
  - `table`×3, `table-bordered`×3, `table-striped`×2, `table-responsive`×2 → tum-ui-table / tumUiTable
  - `alert`×2, `alert-warning`×1, `alert-info`×1 → tum-ui-message
  - `row`×2, `col-lg-11`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `app/exam/manage/exam-scores/exam-scores.component.scss`: 1 raw colors
  - 18 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exam/manage/test-runs/test-run-management/test-run-management.component.html` — 36 hits, 18 in imported units
  - `d-none`×6 → hidden
  - `d-md-table-cell`×6 → md:flex / md:hidden …
  - `btn`×5, `btn-primary`×5, `btn-sm`×5 → tum-ui-button / tumUiButton
  - `spinner-border`×1, `spinner-border-sm`×1 → tum-ui-progress-spinner
  - `alert`×1, `alert-warning`×1 → tum-ui-message
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `w-100`×1 → w-full / h-full or an explicit size
  - `btn-group`×1 → tum-ui-button-group
  - ng-bootstrap: ngbTooltip
  - 11 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/exam/manage/exams/exam-exercise-import/exam-exercise-import.component.html` — 35 hits, 1 in imported units
  - `form-control`×4 → tumUiInput
  - `invalid-feedback`×4 → tum-ui-form-field
  - `d-block`×4, `d-flex`×1 → flex / block / grid / inline-block
  - `table`×3, `table-striped`×3, `table-hover`×2 → tum-ui-table / tumUiTable
  - `justify-content-center`×3 → justify-*
  - `w-25`×2, `w-75`×2 → w-full / h-full or an explicit size
  - `form-check-label`×2, `form-check-input`×2, `form-check`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 59 more units in the detail JSON

## atlas — 786 hits, 15 of 65 units Bootstrap-free

- `app/atlas/manage/agent-chat-modal/agent-chat-modal.component.html` — 80 hits, 41 in imported units
  - `d-flex`×5, `d-block`×3 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `text-success`×2, `text-danger`×2, `bg-success`×1 → text-state-* / bg-state-* / border-state-*
  - `text-secondary`×2, `text-body-secondary`×2, `text-body`×1, `text-muted`×1 → --text-body-secondary
  - `badge`×2 → tum-ui-tag
  - `modal-header`×1, `modal-title`×1, `modal-close-button`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `flex-column`×1 → flex-col
  - `flex-grow-1`×1 → grow / shrink
  - `align-self-start`×1 → self-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `form-control`×1 → tumUiInput
  - `justify-content-between`×1 → justify-*
  - PrimeNG: pButton → tumUiButton, p-checkbox → tum-ui-checkbox, p-select → tum-ui-select
  - `app/atlas/manage/agent-chat-modal/agent-chat-modal.component.scss`: 45 --bs-* variables, 1 raw colors
  - 23 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/atlas/manage/course-competency-relation-form/course-competency-relation-form.component.html` — 44 hits, 6 in imported units
  - `d-flex`×5 → flex / block / grid / inline-block
  - `align-items-center`×4, `align-items-end`×1 → items-*
  - `form-group`×3 → tum-ui-form-field
  - `col`×3, `row`×1, `gx-2`×1, `col-3`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-select`×3 → tum-ui-select
  - `border-danger`×3, `text-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `btn`×3, `btn-danger`×1, `btn-info`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `justify-content-between`×2, `justify-content-end`×1 → justify-*
  - `text-muted`×2 → --text-body-secondary
  - `list-group`×1, `list-group-item`×1 → tum-ui-list
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `flex-grow-1`×1 → grow / shrink
  - `badge`×1 → tum-ui-tag
  - `app/atlas/manage/course-competency-relation-form/course-competency-relation-form.component.scss`: 2 --bs-* variables
  - 26 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/atlas/overview/course-competencies/course-competencies-details.component.html` — 40 hits, 334 in imported units
  - `row`×5, `g-0`×2, `col-7`×2, `col-5`×2, `col`×1, `col-lg-9`×1, `col-md-8`×1, `col-12`×1, `col-lg-11`×1, `col-lg-3`×1, `col-md-4`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `badge`×3 → tum-ui-tag
  - `d-flex`×1, `d-block`×1 → flex / block / grid / inline-block
  - `justify-content-center`×1 → justify-*
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `align-items-center`×1 → items-*
  - `bg-warning`×1, `bg-danger`×1, `bg-success`×1 → text-state-* / bg-state-* / border-state-*
  - `btn`×1, `btn-sm`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:flex / md:hidden …
  - `w-50`×1 → w-full / h-full or an explicit size
  - ng-bootstrap: ngbTooltip
  - `app/course/overview/course-overview/course-overview.scss`: 4 raw colors (shared by 13 units)
  - 10 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/atlas/overview/learning-path-student-nav/learning-path-student-nav.component.html` — 40 hits, 67 in imported units
  - `col-md-auto`×7, `row`×4, `col-4`×3, `col`×3 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `align-items-center`×3 → items-*
  - `btn`×3, `btn-primary`×2, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `justify-content-center`×3, `justify-content-between`×1, `justify-content-start`×1, `justify-content-end`×1 → justify-*
  - `d-flex`×2 → flex / block / grid / inline-block
  - `text-truncate`×2 → truncate
  - `text-secondary`×2 → --text-body-secondary
  - `dropdown`×1 → tum-ui-menu
  - `h-100`×1 → w-full / h-full or an explicit size
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 8 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/atlas/manage/competency-management/competency-management-table.component.html` — 34 hits, 31 in imported units
  - `d-none`×7 → hidden
  - `btn`×6, `btn-primary`×3, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `d-lg-table-cell`×6, `d-md-inline`×1 → md:flex / md:hidden …
  - `d-flex`×3, `d-inline`×1 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `justify-content-end`×1 → justify-*
  - PrimeNG: p-iconfield → tum-ui-icon-field, p-inputicon, pInputText
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/atlas/manage/import-standardized-competencies/course-import-standardized-competencies.component.html` — 31 hits, 5 in imported units
  - `d-flex`×7 → flex / block / grid / inline-block
  - `col-2`×4, `col`×2, `col-1`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `align-items-center`×3 → items-*
  - `flex-grow-1`×2 → grow / shrink
  - `h-100`×2, `w-50`×1, `w-100`×1 → w-full / h-full or an explicit size
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `card`×1 → tum-ui-card / tum-ui-panel
  - `justify-content-center`×1 → justify-*
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - PrimeNG: pTooltip → tumUiTooltip
  - 13 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 44 more units in the detail JSON

## quiz — 750 hits, 15 of 48 units Bootstrap-free

- `app/quiz/manage/short-answer-question/short-answer-question-edit.component.html` — 97 hits, 20 in imported units
  - `btn`×15, `btn-outline-secondary`×13 → tum-ui-button / tumUiButton
  - `form-group`×7, `form-text`×2 → tum-ui-form-field
  - `col-12`×7, `row`×4, `col-md-4`×2, `col-md-6`×2, `col`×2, `col-md-3`×2, `col-md-2`×1, `col-md-7`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×4 → flex / block / grid / inline-block
  - `align-items-center`×4, `align-items-start`×1 → items-*
  - `form-check-input`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `text-danger`×2, `bg-success`×1 → text-state-* / bg-state-* / border-state-*
  - `btn-group`×2 → tum-ui-button-group
  - `badge`×1 → tum-ui-tag
  - `form-select`×1 → tum-ui-select
  - `form-control`×1 → tumUiInput
  - `flex-shrink-0`×1 → grow / shrink
  - `justify-content-center`×1, `justify-content-md-start`×1, `justify-content-start`×1 → justify-*
  - `input-group-btn`×1 → tum-ui-input-group
  - PrimeNG: pInputText, p-inputnumber → tum-ui-input-number, p-select → tum-ui-select, p-checkbox → tum-ui-checkbox
  - ng-bootstrap: ngbTooltip, ngbCollapse
  - `app/quiz/manage/exercise/quiz-exercise.scss`: 12 raw colors (shared by 3 units)
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/quiz/manage/drag-and-drop-question/drag-and-drop-question-edit.component.html` — 93 hits, 31 in imported units
  - `btn`×16, `btn-outline-secondary`×14, `btn-lg`×1 → tum-ui-button / tumUiButton
  - `form-group`×5 → tum-ui-form-field
  - `row`×5, `col-12`×4, `col-md-3`×2, `col-lg-7`×2, `col-md-8`×2, `col-sm-8`×2, `col-md-4`×1, `col-md-2`×1, `col-10`×1, `col-lg-11`×1, `col-2`×1, `col-lg-1`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×4 → flex / block / grid / inline-block
  - `align-items-center`×3 → items-*
  - `justify-content-start`×2 → justify-*
  - `badge`×1 → tum-ui-tag
  - `bg-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `form-select`×1 → tum-ui-select
  - `form-control`×1 → tumUiInput
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `flex-shrink-0`×1 → grow / shrink
  - `input-group-btn`×1, `input-group`×1, `input-group-prepend`×1 → tum-ui-input-group
  - PrimeNG: pInputText, p-inputnumber → tum-ui-input-number, p-select → tum-ui-select, p-checkbox → tum-ui-checkbox
  - ng-bootstrap: ngbTooltip, ngbCollapse
  - `app/quiz/manage/exercise/quiz-exercise.scss`: 12 raw colors (shared by 3 units)
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/quiz/manage/update/quiz-exercise-update.component.html` — 91 hits, 494 in imported units
  - `form-group`×8, `invalid-feedback`×2 → tum-ui-form-field
  - `form-control-label`×6 → tumUiInput
  - `col-lg-4`×5, `col-sm-12`×5, `row`×3, `col-lg-12`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `visually-hidden`×4 → sr-only
  - `d-flex`×3 → flex / block / grid / inline-block
  - `btn`×2, `btn-secondary`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `badge`×2 → tum-ui-tag
  - `align-items-center`×2 → items-*
  - `alert`×1, `alert-warning`×1 → tum-ui-message
  - `bg-info`×1 → text-state-* / bg-state-* / border-state-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `form-check`×1 → tum-ui-checkbox / tum-ui-radio-button
  - PrimeNG: p-inputnumber → tum-ui-input-number, p-select → tum-ui-select, p-checkbox → tum-ui-checkbox, pInputText, pButton → tumUiButton, pTextarea → tumUiTextarea
  - ng-bootstrap: ngbTooltip
  - `app/quiz/manage/update/quiz-exercise-update.component.scss`: 32 --bs-* variables, 7 raw colors
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - 14 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/quiz/manage/list-edit-existing/quiz-question-list-edit-existing.component.html` — 52 hits, 1 in imported units
  - `btn`×4, `btn-outline-primary`×2, `btn-primary`×1, `btn-default`×1, `btn-outline-secondary`×1 → tum-ui-button / tumUiButton
  - `form-check`×4, `form-check-input`×4, `form-check-label`×4 → tum-ui-checkbox / tum-ui-radio-button
  - `w-100`×3 → w-full / h-full or an explicit size
  - `badge`×3 → tum-ui-tag
  - `row`×2, `col`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-select`×2 → tum-ui-select
  - `form-control`×2 → tumUiInput
  - `justify-content-center`×1, `justify-content-start`×1 → justify-*
  - `card-header`×1 → tum-ui-card / tum-ui-panel
  - `btn-group`×1 → tum-ui-button-group
  - `form-group`×1 → tum-ui-form-field
  - `d-flex`×1 → flex / block / grid / inline-block
  - `flex-grow-0`×1, `flex-grow-1`×1 → grow / shrink
  - `input-group`×1 → tum-ui-input-group
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - `bg-info`×1, `bg-warning`×1, `bg-success`×1 → text-state-* / bg-state-* / border-state-*
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/quiz/manage/multiple-choice-question/multiple-choice-question-edit.component.html` — 52 hits, 42 in imported units
  - `btn`×8, `btn-outline-secondary`×6 → tum-ui-button / tumUiButton
  - `align-items-center`×4 → items-*
  - `col-12`×4, `col-md-3`×2, `row`×1, `col-md-4`×1, `col-md-2`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-group`×4 → tum-ui-form-field
  - `d-flex`×3 → flex / block / grid / inline-block
  - `badge`×1 → tum-ui-tag
  - `bg-info`×1 → text-state-* / bg-state-* / border-state-*
  - `form-control`×1 → tumUiInput
  - `flex-shrink-0`×1 → grow / shrink
  - PrimeNG: pInputText, p-inputnumber → tum-ui-input-number, p-select → tum-ui-select, p-checkbox → tum-ui-checkbox
  - ng-bootstrap: ngbTooltip, ngbCollapse
  - `app/quiz/manage/exercise/quiz-exercise.scss`: 12 raw colors (shared by 3 units)
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - 6 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/quiz/manage/re-evaluate/quiz-re-evaluate.component.html` — 50 hits, 316 in imported units
  - `row`×8, `col-12`×2, `col-11`×1, `col-1`×1, `col-lg-7`×1, `col-lg-5`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-group`×6 → tum-ui-form-field
  - `form-control`×4, `form-control-label`×1 → tumUiInput
  - `badge`×4 → tum-ui-tag
  - `btn`×3, `btn-outline-secondary`×1, `btn-warning`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `visually-hidden`×3 → sr-only
  - `text-warning`×1, `bg-success`×1, `bg-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `input-group-btn`×1 → tum-ui-input-group
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `card`×1 → tum-ui-card / tum-ui-panel
  - ng-bootstrap: ngbTooltip
  - `app/quiz/shared/quiz.scss`: 2 --bs-* variables (shared by 12 units)
  - `app/quiz/manage/re-evaluate/quiz-re-evaluate.component.scss`: 1 --bs-* variables
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 27 more units in the detail JSON

## communication — 711 hits, 14 of 60 units Bootstrap-free

- `app/communication/faq/faq.component.html` — 50 hits, 4 in imported units
  - `btn`×7, `btn-sm`×7, `btn-primary`×4, `btn-success`×2, `btn-secondary`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `d-flex`×4 → flex / block / grid / inline-block
  - `d-md-inline`×4, `d-sm-none`×1, `d-md-table-cell`×1 → md:flex / md:hidden …
  - `d-none`×3 → hidden
  - `btn-group`×2, `btn-group-vertical`×2 → tum-ui-button-group
  - `align-items-center`×2 → items-*
  - `row`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `flex-grow-1`×1 → grow / shrink
  - `align-self-center`×1 → self-*
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 14 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/communication/shared/discussion-section/discussion-section.component.html` — 50 hits, 173 in imported units
  - `row`×9, `col-12`×3, `col`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×5 → flex / block / grid / inline-block
  - `flex-grow-1`×5 → grow / shrink
  - `flex-column`×4 → flex-col
  - `form-group`×3 → tum-ui-form-field
  - `form-check-input`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `h-100`×2 → w-full / h-full or an explicit size
  - `card-body`×2, `card`×1, `card-header`×1 → tum-ui-card / tum-ui-panel
  - `d-none`×2 → hidden
  - `d-md-inline`×2 → md:flex / md:hidden …
  - `justify-content-between`×1 → justify-*
  - `align-items-baseline`×1 → items-*
  - `btn`×1, `btn-sm`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - ng-bootstrap: ngbTooltip
  - `app/communication/shared/discussion-section/discussion-section.component.scss`: 2 --bs-* variables
  - 23 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/communication/course-conversations-components/layout/conversation-header/conversation-header.component.html` — 37 hits, 165 in imported units
  - `btn`×7, `btn-sm`×7, `btn-outline-secondary`×6, `btn-toolbar`×2, `btn-info`×1 → tum-ui-button / tumUiButton
  - `d-flex`×4, `d-inline-block`×3 → flex / block / grid / inline-block
  - `justify-content-between`×2 → justify-*
  - `btn-group`×2 → tum-ui-button-group
  - `align-items-center`×1 → items-*
  - `d-sm-none`×1 → md:flex / md:hidden …
  - `text-body-secondary`×1 → --text-body-secondary
  - 11 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/communication/course-conversations-components/dialogs/channels-create-dialog/channel-form/channel-form.component.html` — 33 hits
  - `d-block`×6 → flex / block / grid / inline-block
  - `form-group`×5, `form-text`×4 → tum-ui-form-field
  - `text-body-secondary`×4 → --text-body-secondary
  - `row`×2, `col-12`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `input-group`×1, `input-group-text`×1 → tum-ui-input-group
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - PrimeNG: p-selectbutton → tum-ui-select-button
- `app/communication/shared/conversation-global-search/conversation-global-search.component.html` — 32 hits, 23 in imported units
  - `list-group-item`×4, `list-group`×2 → tum-ui-list
  - `btn-close`×3, `btn-close-white`×2, `btn-sm`×2 → tum-ui-button / tumUiButton
  - `text-muted`×3, `text-secondary`×1 → --text-body-secondary
  - `dropdown-option`×3 → tum-ui-menu
  - `align-items-center`×2 → items-*
  - `badge`×2 → tum-ui-tag
  - `input-group`×1 → tum-ui-input-group
  - `d-none`×1 → hidden
  - `d-sm-flex`×1 → md:flex / md:hidden …
  - `form-control`×1 → tumUiInput
  - `d-flex`×1 → flex / block / grid / inline-block
  - ng-bootstrap: ngbTooltip
  - `app/communication/shared/conversation-global-search/conversation-global-search.component.scss`: 3 raw colors
  - 15 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/communication/course-conversations-components/dialogs/conversation-add-users-dialog/add-users-form/conversation-add-users-form.component.html` — 31 hits, 29 in imported units
  - `row`×4, `col-12`×4 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `btn`×3, `btn-check`×2, `btn-secondary`×2, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `form-check`×3, `form-check-input`×3, `form-check-label`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `alert`×2, `alert-info`×1, `alert-danger`×1 → tum-ui-message
  - `form-group`×1 → tum-ui-form-field
  - `btn-group`×1 → tum-ui-button-group
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 40 more units in the detail JSON

## lecture — 583 hits, 13 of 44 units Bootstrap-free

- `app/lecture/manage/lecture-units/management/lecture-unit-management.component.html` — 61 hits, 376 in imported units
  - `badge`×9 → tum-ui-tag
  - `d-flex`×8 → flex / block / grid / inline-block
  - `flex-fill`×6 → flex-1
  - `w-100`×5 → w-full / h-full or an explicit size
  - `btn`×5, `btn-sm`×5, `btn-primary`×3, `btn-warning`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `bg-info`×4, `bg-danger`×2, `bg-success`×2 → text-state-* / bg-state-* / border-state-*
  - `justify-content-center`×3, `justify-content-end`×1 → justify-*
  - `flex-column`×2 → flex-col
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `d-none`×1 → hidden
  - `d-sm-flex`×1 → md:flex / md:hidden …
  - ng-bootstrap: ngbTooltip
  - 17 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lecture/manage/lecture-units/attachment-video-unit-form/attachment-video-unit-form.component.html` — 58 hits, 19 in imported units
  - `alert`×8, `alert-danger`×7, `alert-info`×1 → tum-ui-message
  - `form-group`×7, `form-text`×2 → tum-ui-form-field
  - `form-control`×6 → tumUiInput
  - `row`×5, `col-4`×3, `col-1`×3, `col-7`×3, `col-12`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `btn`×3, `btn-primary`×2, `btn-sm`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `text-body-secondary`×2 → --text-body-secondary
  - `input-group`×1 → tum-ui-input-group
  - `align-self-center`×1 → self-*
  - ng-bootstrap: ngbTooltip
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lecture/manage/lecture/lecture.component.html` — 45 hits, 59 in imported units
  - `btn`×7, `btn-sm`×7, `btn-primary`×6, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `form-check-input`×4 → tum-ui-checkbox / tum-ui-radio-button
  - `d-md-inline`×3, `d-md-table-cell`×1 → md:flex / md:hidden …
  - `d-flex`×2 → flex / block / grid / inline-block
  - `btn-group`×2, `btn-group-vertical`×2 → tum-ui-button-group
  - `d-none`×2 → hidden
  - `row`×1, `col-4`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `align-items-center`×1 → items-*
  - `text-truncate`×1 → truncate
  - `table-responsive`×1, `table`×1, `table-striped`×1 → tum-ui-table / tumUiTable
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 16 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lecture/manage/pdf-preview/pdf-preview.component.html` — 35 hits, 62 in imported units
  - `btn`×7, `btn-primary`×4, `btn-success`×1, `btn-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `d-flex`×4 → flex / block / grid / inline-block
  - `text-truncate`×3 → truncate
  - `justify-content-between`×2, `justify-content-center`×1, `justify-content-end`×1 → justify-*
  - `spinner-border`×2, `spinner-border-sm`×1 → tum-ui-progress-spinner
  - `visually-hidden`×2 → sr-only
  - `row`×1, `col-12`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `align-items-center`×1 → items-*
  - `popover-title`×1 → tum-ui-popover
  - `text-muted`×1 → --text-body-secondary
  - ng-bootstrap: ngbPopover, ngbTooltip
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lecture/manage/lecture-update/lecture-update.component.html` — 34 hits, 611 in imported units
  - `d-flex`×5 → flex / block / grid / inline-block
  - `form-group`×3, `form-text`×1 → tum-ui-form-field
  - `btn`×3, `btn-secondary`×1, `btn-primary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `align-items-center`×2 → items-*
  - `justify-content-end`×2, `justify-content-center`×1 → justify-*
  - `flex-grow-1`×2 → grow / shrink
  - `alert`×2, `alert-warning`×1, `alert-danger`×1 → tum-ui-message
  - `row`×1, `col-md-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-control-label`×1 → tumUiInput
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `text-body-secondary`×1 → --text-body-secondary
  - `input-group`×1 → tum-ui-input-group
  - `spinner-border`×1, `spinner-border-sm`×1 → tum-ui-progress-spinner
  - PrimeNG: p-selectbutton → tum-ui-select-button, p-checkbox → tum-ui-checkbox, pTooltip → tumUiTooltip
  - ng-bootstrap: ngbTooltip
  - 13 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lecture/manage/lecture-units/unit-creation-card/unit-creation-card.component.html` — 30 hits
  - `btn`×8, `btn-sm`×8, `btn-primary`×8 → tum-ui-button / tumUiButton
  - `d-flex`×2 → flex / block / grid / inline-block
  - `justify-content-center`×2 → justify-*
  - `align-items-center`×2 → items-*
  - 11 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 25 more units in the detail JSON

## assessment — 416 hits, 12 of 37 units Bootstrap-free

- `app/assessment/shared/assessment-dashboard/exercise-dashboard/exercise-assessment-dashboard.component.html` — 122 hits, 128 in imported units
  - `btn`×12, `btn-sm`×7, `btn-primary`×6, `btn-success`×3, `btn-link`×2, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `alert`×10, `alert-info`×7, `alert-warning`×2, `alert-danger`×1 → tum-ui-message
  - `row`×7, `col-12`×5, `g-0`×4, `col-7`×4, `col-5`×4, `col-xl-4`×3, `col-6`×2, `col-md-7`×1, `col-md-5`×1, `col-lg-7`×1, `col-md-6`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-inline-block`×7, `d-flex`×3, `d-block`×2 → flex / block / grid / inline-block
  - `text-success`×5, `text-warning`×4, `text-danger`×2, `bg-success`×1, `bg-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `text-secondary`×3 → --text-body-secondary
  - `table-responsive`×3, `table`×3 → tum-ui-table / tumUiTable
  - `justify-content-between`×1, `justify-content-center`×1, `justify-content-lg-end`×1 → justify-*
  - `flex-grow-1`×1 → grow / shrink
  - PrimeNG: p-message → tum-ui-message, pTooltip → tumUiTooltip
  - ng-bootstrap: ngbTooltip
  - 16 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/assessment/manage/complaints-for-tutor/complaints-for-tutor.component.html` — 40 hits, 1 in imported units
  - `col-12`×6, `row`×2, `col-md-6`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `btn`×4, `btn-block`×3, `btn-success`×2, `btn-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `d-flex`×3 → flex / block / grid / inline-block
  - `alert`×2, `alert-info`×2 → tum-ui-message
  - `badge`×2 → tum-ui-tag
  - `justify-content-center`×1, `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - `bg-success`×1, `bg-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `flex-column`×1 → flex-col
  - `d-none`×1 → hidden
  - `d-sm-block`×1 → md:flex / md:hidden …
  - 9 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/assessment/manage/grading/bonus/bonus.component.html` — 33 hits, 8 in imported units
  - `row`×5, `col-1`×3, `col`×3 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `text-warning`×4 → text-state-* / bg-state-* / border-state-*
  - `form-group`×3 → tum-ui-form-field
  - `text-secondary`×2 → --text-body-secondary
  - `d-flex`×2, `d-block`×2 → flex / block / grid / inline-block
  - `table`×2, `table-striped`×2 → tum-ui-table / tumUiTable
  - `align-items-baseline`×1, `align-items-center`×1 → items-*
  - `form-select`×1 → tum-ui-select
  - `alert`×1, `alert-warning`×1 → tum-ui-message
  - ng-bootstrap: ngbTooltip
  - 25 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/assessment/manage/grading/grading.component.html` — 33 hits, 22 in imported units
  - `form-group`×5 → tum-ui-form-field
  - `btn`×4, `btn-danger`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `alert`×4, `alert-info`×2, `alert-warning`×2 → tum-ui-message
  - `form-select`×3 → tum-ui-select
  - `dropdown-container`×2 → tum-ui-menu
  - `table`×2, `table-striped`×2 → tum-ui-table / tumUiTable
  - `text-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `form-control`×1 → tumUiInput
  - `col-12`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - ng-bootstrap: ngbTooltip
  - 9 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/assessment/manage/list-of-complaints/list-of-complaints.component.html` — 31 hits
  - `btn`×3, `btn-primary`×3, `btn-outline-primary`×2, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `text-warning`×2, `text-success`×2, `text-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `col-12`×1, `row`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `btn-group`×1, `btn-group-sm`×1 → tum-ui-button-group
  - `spinner-border`×1, `spinner-border-sm`×1 → tum-ui-progress-spinner
  - `form-select`×1 → tum-ui-select
  - `text-muted`×1 → --text-body-secondary
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `table-responsive`×1, `table`×1 → tum-ui-table / tumUiTable
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - ng-bootstrap: ngbTooltip
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/assessment/manage/unreferenced-feedback-detail/unreferenced-feedback-detail.component.html` — 26 hits, 7 in imported units
  - `btn`×3, `btn-sm`×2, `btn-success`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `row`×3, `col-4`×2, `col`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-group`×2 → tum-ui-form-field
  - `form-control`×2 → tumUiInput
  - `card`×1, `card-header`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `text-secondary`×1, `text-dark`×1 → --text-body-secondary
  - `text-success`×1, `text-danger`×1, `text-warning`×1 → text-state-* / bg-state-* / border-state-*
  - ng-bootstrap: ngbTooltip
  - 6 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 19 more units in the detail JSON

## core — 311 hits, 15 of 41 units Bootstrap-free

- `app/core/home/home.component.html` — 53 hits, 4 in imported units
  - `w-100`×13, `h-100`×1 → w-full / h-full or an explicit size
  - `d-flex`×9, `d-block`×1 → flex / block / grid / inline-block
  - `flex-column`×5 → flex-col
  - `form-group`×5 → tum-ui-form-field
  - `align-items-center`×3 → items-*
  - `justify-content-center`×2 → justify-*
  - `row`×2, `col-md-8`×1, `col-12`×1, `col-xl-5`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `flex-grow-1`×2 → grow / shrink
  - `form-check`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `text-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `btn-toolbar`×1 → tum-ui-button / tumUiButton
  - `text-muted`×1 → --text-body-secondary
  - 35 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/core/navbar/navbar.component.html` — 53 hits, 34 in imported units
  - `dropdown-item`×7, `dropdown`×2, `dropdown-toggle`×2, `dropdown-menu`×2, `dropdown-divider`×2, `dropdown-menu-index`×1, `dropdown-header`×1 → tum-ui-menu
  - `d-flex`×4 → flex / block / grid / inline-block
  - `align-items-center`×4 → items-*
  - `nav-link`×2 → tum-ui-tabs
  - `align-self-center`×2 → self-*
  - `justify-content-center`×2 → justify-*
  - `breadcrumb-link`×2, `navbar`×1, `navbar-brand`×1, `navbar-title`×1, `navbar-version`×1, `navbar-course-link`×1, `navbar-course-title`×1, `navbar-collapse`×1, `navbar-course-image`×1, `breadcrumb-container`×1, `breadcrumb`×1, `breadcrumb-divider`×1, `breadcrumb-item`×1 → no guideline target
  - `collapse`×1 → tum-ui-panel
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbTooltip, ngbCollapse
  - `app/core/navbar/navbar.scss`: 7 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/core/navbar/global-search/components/views/iris-answer/global-search-iris-answer.component.html` — 40 hits, 4 in imported units
  - `align-items-center`×5 → items-*
  - `d-inline-flex`×3, `d-flex`×2 → flex / block / grid / inline-block
  - `flex-shrink-0`×2 → grow / shrink
  - `text-truncate`×1 → truncate
  - `text-body-secondary`×1 → --text-body-secondary
  - `justify-content-center`×1 → justify-*
  - `app/core/navbar/global-search/components/views/iris-answer/global-search-iris-answer.component.scss`: 25 --bs-* variables
  - 2 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.html` — 36 hits
  - `align-items-center`×9, `align-items-start`×1 → items-*
  - `d-flex`×8, `d-inline-flex`×2 → flex / block / grid / inline-block
  - `text-secondary`×3 → --text-body-secondary
  - `badge`×2 → tum-ui-tag
  - `flex-shrink-0`×1, `flex-grow-1`×1 → grow / shrink
  - `text-truncate`×1 → truncate
  - `app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.scss`: 7 --bs-* variables, 1 raw colors
  - 19 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/core/navbar/global-search/components/modal/search-input/search-input.component.html` — 18 hits
  - `app/core/navbar/global-search/components/modal/search-input/search-input.component.scss`: 18 --bs-* variables
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/core/navbar/global-search/components/modal/filter-menu/global-search-filter-menu.component.html` — 16 hits
  - `app/core/navbar/global-search/components/modal/filter-menu/global-search-filter-menu.component.scss`: 16 --bs-* variables
- … 20 more units in the detail JSON

## shared-ui — 305 hits, 39 of 76 units Bootstrap-free

- `app/shared-ui/components/resizable-panels/resizable-panels.component.html` — 46 hits
  - `d-flex`×5 → flex / block / grid / inline-block
  - `w-100`×4, `h-100`×4 → w-full / h-full or an explicit size
  - `flex-column`×4 → flex-col
  - `flex-grow-1`×4, `flex-shrink-0`×1 → grow / shrink
  - `align-items-center`×2 → items-*
  - PrimeNG: p-splitter, p-tabs → tum-ui-tabs, p-tablist, p-tab → tum-ui-tab
  - `app/shared-ui/components/resizable-panels/resizable-panels.component.scss`: 22 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/shared-ui/components/buttons/code-button/code-button.component.html` — 34 hits, 12 in imported units
  - `btn`×6, `btn-sm`×6, `btn-primary`×5, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `dropdown-item`×3, `dropdown-toggle`×1, `dropdown-menu`×1 → tum-ui-menu
  - `alert`×2, `alert-warning`×2 → tum-ui-message
  - `d-flex`×2 → flex / block / grid / inline-block
  - `btn-group`×1 → tum-ui-button-group
  - `align-items-center`×1 → items-*
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:flex / md:hidden …
  - ng-bootstrap: ngbPopover, ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/shared-ui/export/modal/export-modal.component.html` — 34 hits
  - `form-group`×5 → tum-ui-form-field
  - `btn`×5, `btn-primary`×3, `btn-default`×3, `btn-close`×1, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `form-control-label`×3 → tumUiInput
  - `btn-group`×3 → tum-ui-button-group
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `nav-tabs`×1 → tum-ui-tabs
  - `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `flex-grow-1`×1 → grow / shrink
  - `d-flex`×1 → flex / block / grid / inline-block
  - ng-bootstrap: ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/shared-ui/feature-activation/feature-activation.component.html` — 14 hits, 5 in imported units
  - `d-flex`×3 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `justify-content-center`×2 → justify-*
  - `card`×1, `card-header`×1, `card-body`×1, `card-footer`×1 → tum-ui-card / tum-ui-panel
  - `row`×1, `g-4`×1, `col-md-12`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - 13 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` — 12 hits
  - `btn`×1, `btn-outline-primary`×1, `btn-sm`×1, `btn-primary`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1, `d-xl-inline`×1 → md:flex / md:hidden …
  - `app/course/overview/course-overview/course-overview.scss`: 4 raw colors (shared by 13 units)
- `app/shared-ui/form/title-channel-name-primeng/title-channel-name-primeng.component.html` — 12 hits
  - `form-group`×2 → tum-ui-form-field
  - `col-lg-6`×2, `row`×1, `col-12`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `form-control-label`×2 → tumUiInput
  - `w-100`×2 → w-full / h-full or an explicit size
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - PrimeNG: pInputText
- … 32 more units in the detail JSON

## plagiarism — 217 hits, 3 of 15 units Bootstrap-free

- `app/plagiarism/manage/exercise-update-plagiarism/exercise-update-plagiarism.component.html` — 55 hits
  - `form-group`×5, `form-text`×4 → tum-ui-form-field
  - `col-12`×4, `col-md-6`×4, `col-xl-3`×4, `row`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×4 → flex / block / grid / inline-block
  - `flex-column`×4 → flex-col
  - `h-100`×4 → w-full / h-full or an explicit size
  - `form-control-label`×4, `form-control`×4 → tumUiInput
  - `text-danger`×4, `border-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `form-check`×2, `form-check-input`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `btn`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `badge`×1 → tum-ui-tag
  - ng-bootstrap: ngbTooltip
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/plagiarism/manage/instructor-view/detail-view/plagiarism-case-instructor-detail-view.component.html` — 43 hits, 198 in imported units
  - `col-12`×4, `col-lg-6`×4, `col-xl-3`×4, `row`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×4 → flex / block / grid / inline-block
  - `btn`×4, `btn-primary`×3, `btn-secondary`×1, `btn-md`×1 → tum-ui-button / tumUiButton
  - `align-items-center`×3 → items-*
  - `text-truncate`×2 → truncate
  - `btn-group`×2 → tum-ui-button-group
  - `form-control`×2 → tumUiInput
  - `flex-column`×1 → flex-col
  - `justify-content-xl-end`×1 → justify-*
  - `dropdown-toggle-split`×1, `dropdown-menu`×1 → tum-ui-menu
  - `nav-tabs`×1 → tum-ui-tabs
  - `input-group`×1, `input-group-text`×1 → tum-ui-input-group
  - `form-group`×1 → tum-ui-form-field
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 10 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/plagiarism/overview/detail-view/plagiarism-case-student-detail-view.component.html` — 36 hits, 194 in imported units
  - `col-12`×6, `col-lg-6`×4, `col-xl-3`×4, `row`×3 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×4 → flex / block / grid / inline-block
  - `align-items-center`×3 → items-*
  - `alert`×3, `alert-danger`×2, `alert-warning`×1 → tum-ui-message
  - `text-truncate`×2 → truncate
  - `flex-column`×1 → flex-col
  - `justify-content-xl-end`×1 → justify-*
  - `btn`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - 9 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/plagiarism/manage/plagiarism-inspector/plagiarism-inspector.component.html` — 33 hits, 23 in imported units
  - `btn`×5, `btn-danger`×2, `btn-info`×1, `btn-primary`×1, `btn-secondary`×1, `btn-block`×1 → tum-ui-button / tumUiButton
  - `form-check`×4, `form-check-input`×4, `form-check-label`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `form-control`×3 → tumUiInput
  - `flex-grow-0`×1 → grow / shrink
  - `text-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `d-flex`×1 → flex / block / grid / inline-block
  - `flex-column`×1 → flex-col
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `align-self-center`×1 → self-*
  - `visually-hidden`×1 → sr-only
  - PrimeNG: p-dialog → tum-ui-dialog
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbTooltip
  - `app/plagiarism/manage/plagiarism-inspector/plagiarism-inspector.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/plagiarism/manage/instructor-view/plagiarism-cases-instructor-view.component.html` — 16 hits, 10 in imported units
  - `col-3`×9, `row`×2, `col-1`×1, `col-2`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `card`×1, `card-header`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/plagiarism/manage/plagiarism-header/plagiarism-header.component.html` — 11 hits
  - `btn`×3, `btn-sm`×3, `btn-primary`×1, `btn-success`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `text-secondary`×1 → --text-body-secondary
  - `app/plagiarism/manage/plagiarism-header/plagiarism-header.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 6 more units in the detail JSON

## text — 206 hits, 3 of 16 units Bootstrap-free

- `app/text/manage/example-text-submission/example-text-submission.component.html` — 40 hits, 141 in imported units
  - `btn`×9, `btn-primary`×6, `btn-check`×2, `btn-outline-secondary`×2, `btn-success`×1 → tum-ui-button / tumUiButton
  - `col-12`×3, `col-3`×2, `row`×1, `col-6`×1, `col`×1, `col-4`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `alert`×2, `alert-info`×2 → tum-ui-message
  - `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `btn-group`×1 → tum-ui-button-group
  - `app/text/manage/example-text-submission/example-text-submission.component.scss`: 2 raw colors
  - 14 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.html` — 38 hits, 8 in imported units
  - `form-group`×5 → tum-ui-form-field
  - `col-md-1`×3, `row`×2, `col-md-10`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-inline`×2 → flex / block / grid / inline-block
  - `dropdown-menu`×2, `dropdown-item`×2, `dropdown`×1, `dropdown-toggle`×1, `dropdown-submenu`×1 → tum-ui-menu
  - `form-control`×2 → tumUiInput
  - `alert`×1, `alert-dismissible`×1, `alert-secondary`×1, `alert-success`×1, `alert-danger`×1 → tum-ui-message
  - `close`×1 → tum-ui-button
  - `text-secondary`×1 → --text-body-secondary
  - `input-group`×1, `input-group-prepend`×1 → tum-ui-input-group
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `text-success`×1, `text-danger`×1, `text-warning`×1 → text-state-* / bg-state-* / border-state-*
  - ng-bootstrap: ngbTooltip, ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - `app/text/manage/assess/textblock-feedback-editor/text-block-feedback-editor.component.scss`: 1 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/text/manage/text-exercise/row-buttons/text-exercise-row-buttons.component.html` — 26 hits, 3 in imported units
  - `btn`×5, `btn-sm`×5, `btn-primary`×2, `btn-info`×1, `btn-success`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
  - `d-none`×5 → hidden
  - `d-md-inline`×5 → md:flex / md:hidden …
  - `btn-group`×1 → tum-ui-button-group
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/text/manage/text-exercise/update/text-exercise-update.component.html` — 23 hits, 258 in imported units
  - `form-group`×9 → tum-ui-form-field
  - `form-control-label`×6, `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - ng-bootstrap: NgbModal
  - 6 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/text/overview/text-editor/text-editor.component.html` — 23 hits, 87 in imported units
  - `col-xl-8`×4, `col-md-12`×3, `col-lg-10`×3, `row`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `badge`×3 → tum-ui-tag
  - `w-100`×1 → w-full / h-full or an explicit size
  - `bg-warning`×1 → text-state-* / bg-state-* / border-state-*
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - `app/text/overview/text-editor/text-editor.component.scss`: 1 raw colors, 3 Bootstrap Sass imports
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/text/manage/tutor-effort/tutor-effort-statistics.component.html` — 17 hits
  - `d-flex`×4 → flex / block / grid / inline-block
  - `justify-content-center`×3, `justify-content-between`×1 → justify-*
  - `align-items-center`×2 → items-*
  - `btn`×1, `btn-primary`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `table`×1 → tum-ui-table / tumUiTable
  - `row`×1, `col-10`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `app/text/manage/tutor-effort/tutor-effort-statistics.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- … 7 more units in the detail JSON

## tutorialgroup — 150 hits, 28 of 32 units Bootstrap-free

- `app/tutorialgroup/manage/tutorial-groups-management/tutorial-groups-import-dialog/tutorial-groups-registration-import-dialog.component.html` — 107 hits
  - `btn`×11, `btn-outline-secondary`×5, `btn-check`×3, `btn-secondary`×2, `btn-outline-success`×1, `btn-outline-danger`×1, `btn-primary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `d-inline-block`×11, `d-flex`×8 → flex / block / grid / inline-block
  - `text-truncate`×11 → truncate
  - `form-group`×9 → tum-ui-form-field
  - `table`×5, `table-striped`×5, `table-bordered`×5, `table-sm`×5, `table-responsive`×2 → tum-ui-table / tumUiTable
  - `align-items-center`×4, `align-items-end`×1 → items-*
  - `form-control`×2 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `text-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `btn-group`×1 → tum-ui-button-group
  - `justify-content-between`×1, `justify-content-end`×1 → justify-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `flex-shrink-0`×1, `flex-grow-1`×1 → grow / shrink
  - PrimeNG: p-dialog → tum-ui-dialog
  - 21 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/tutorialgroup/manage/tutorial-groups-configuration/crud/tutorial-groups-configuration-form/tutorial-groups-configuration-form.component.html` — 31 hits
  - `form-text`×3, `invalid-feedback`×2, `form-group`×1 → tum-ui-form-field
  - `btn`×3, `btn-check`×2, `btn-outline-secondary`×2, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `row`×2, `col-12`×2 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `text-body-secondary`×2 → --text-body-secondary
  - `d-block`×2, `d-flex`×1 → flex / block / grid / inline-block
  - `w-100`×1 → w-full / h-full or an explicit size
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - `btn-group`×1 → tum-ui-button-group
  - `justify-content-end`×1 → justify-*
  - PrimeNG: p-datepicker → tum-ui-date-picker
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/tutorialgroup/manage/tutorial-groups-management/tutorial-groups-export-button.component/tutorial-groups-export-button.component.html` — 6 hits
  - `form-check`×2, `form-check-input`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - PrimeNG: p-dialog → tum-ui-dialog
  - 2 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/tutorialgroup/shared/tutorial-group-detail/tutorial-group-detail.component.html` — 6 hits, 18 in imported units
  - `card`×4, `card-row`×2 → tum-ui-card / tum-ui-panel
  - PrimeNG: pButton → tumUiButton, p-selectbutton → tum-ui-select-button, pTooltip → tumUiTooltip, p-confirmdialog → tum-ui-confirm-dialog

## iris — 120 hits, 8 of 22 units Bootstrap-free

- `app/iris/overview/base-chatbot/iris-base-chatbot.component.html` — 47 hits, 65 in imported units
  - `btn`×5, `btn-sm`×3, `btn-primary`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `d-flex`×3 → flex / block / grid / inline-block
  - `align-items-center`×2 → items-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `justify-content-end`×1 → justify-*
  - `form-control`×1 → tumUiInput
  - PrimeNG: p-confirmdialog → tum-ui-confirm-dialog, p-menu → tum-ui-menu, pTooltip → tumUiTooltip
  - `app/iris/overview/base-chatbot/iris-base-chatbot.component.scss`: 22 --bs-* variables, 7 raw colors
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/iris/overview/iris-onboarding-modal/iris-onboarding-modal.component.html` — 22 hits, 8 in imported units
  - `app/iris/overview/iris-onboarding-modal/iris-onboarding-modal.component.scss`: 18 --bs-* variables, 4 raw colors
- `app/iris/overview/about-iris-modal/about-iris-modal.component.html` — 17 hits, 1 in imported units
  - `card-description`×3, `card-title-text`×2 → tum-ui-card / tum-ui-panel
  - `modal-content-wrapper`×1 → tum-ui-dialog
  - PrimeNG: pButton → tumUiButton
  - `app/iris/overview/about-iris-modal/about-iris-modal.component.scss`: 10 --bs-* variables, 1 raw colors
- `app/iris/overview/mcq-question/iris-mcq-question.component.html` — 8 hits
  - `app/iris/overview/mcq-question/iris-mcq-question.component.scss`: 8 --bs-* variables
- `app/iris/overview/mcq-question/iris-mcq-carousel.component.html` — 7 hits, 8 in imported units
  - `carousel-dots`×2, `carousel-header`×1, `carousel-navigation`×1, `carousel-counter`×1 → no guideline target
  - `app/iris/overview/mcq-question/iris-mcq-carousel.component.scss`: 2 --bs-* variables
- `app/iris/overview/context-selection/iris-context-switch-divider.component.html` — 4 hits
  - `app/iris/overview/context-selection/iris-context-switch-divider.component.scss`: 4 --bs-* variables
- … 8 more units in the detail JSON

## fileupload — 72 hits, 0 of 4 units Bootstrap-free

- `app/fileupload/manage/update/file-upload-exercise-update.component.html` — 29 hits, 202 in imported units
  - `form-group`×10 → tum-ui-form-field
  - `form-control-label`×9, `form-control`×3 → tumUiInput
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `text-secondary`×1 → --text-body-secondary
  - ng-bootstrap: NgbModal, ngbTooltip
  - 6 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/fileupload/overview/file-upload-submission/file-upload-submission.component.html` — 19 hits, 88 in imported units
  - `row`×3, `col-12`×1, `col-md-6`×1, `col-xl-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-inline-block`×2 → flex / block / grid / inline-block
  - `badge`×2 → tum-ui-tag
  - `bg-info`×2 → text-state-* / bg-state-* / border-state-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `form-group`×1 → tum-ui-form-field
  - `form-control-label`×1 → tumUiInput
  - `input-group`×1 → tum-ui-input-group
  - `card-text`×1 → tum-ui-card / tum-ui-panel
  - `alert`×1, `alert-info`×1 → tum-ui-message
  - 7 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/fileupload/manage/assess/file-upload-assessment.component.html` — 17 hits, 154 in imported units
  - `col-12`×2, `row`×2, `col-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `alert`×2, `alert-danger`×1, `alert-warning`×1 → tum-ui-message
  - `card-text`×1 → tum-ui-card / tum-ui-panel
  - `badge`×1 → tum-ui-tag
  - `bg-info`×1 → text-state-* / bg-state-* / border-state-*
  - `btn`×1, `btn-info`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:flex / md:hidden …
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/fileupload/manage/exercise-details/file-upload-exercise-detail.component.html` — 7 hits, 235 in imported units
  - `d-flex`×2 → flex / block / grid / inline-block
  - `row`×1, `col-md-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-center`×1, `justify-content-around`×1 → justify-*
  - `align-items-center`×1 → items-*
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## lti — 59 hits, 3 of 6 units Bootstrap-free

- `app/lti/manage/lti13-deep-linking/lti13-deep-linking.component.html` — 42 hits
  - `form-check-input`×7 → tum-ui-checkbox / tum-ui-radio-button
  - `d-sm-inline`×6, `d-md-table-cell`×4 → md:flex / md:hidden …
  - `btn`×4, `btn-secondary`×2, `btn-success`×2 → tum-ui-button / tumUiButton
  - `dropdown-section`×2, `dropdown-toggle`×2, `dropdown-container`×1 → tum-ui-menu
  - `table-responsive`×2, `table`×2, `table-bordered`×2 → tum-ui-table / tumUiTable
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `col`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `d-flex`×1 → flex / block / grid / inline-block
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 8 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lti/manage/lti-course-card/lti-course-card.component.html` — 13 hits
  - `row`×2, `col-2`×2, `col-6`×2, `col-7`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `card`×1, `card-header`×1, `card-title`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `d-flex`×1 → flex / block / grid / inline-block
  - `text-muted`×1 → --text-body-secondary
  - 2 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/lti/manage/lti13-select-course/lti13-select-course.component.html` — 4 hits, 13 in imported units
  - `row`×1, `col-12`×1, `col-lg-6`×1, `col-xl-4`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## modeling — 54 hits, 16 of 19 units Bootstrap-free

- `app/modeling/manage/update/modeling-exercise-update.component.html` — 31 hits, 198 in imported units
  - `form-control-label`×8, `form-control`×2 → tumUiInput
  - `form-group`×7 → tum-ui-form-field
  - `row`×2, `col`×2, `gx-4`×1, `gy-3`×1, `col-12`×1, `col-md`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `alert`×2, `alert-danger`×2 → tum-ui-message
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - ng-bootstrap: NgbModal
  - 8 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/modeling/overview/modeling-submission/modeling-submission.component.html` — 16 hits, 46 in imported units
  - `w-100`×2 → w-full / h-full or an explicit size
  - `d-flex`×1 → flex / block / grid / inline-block
  - `flex-column`×1 → flex-col
  - `app/modeling/overview/modeling-submission/modeling-submission.component.scss`: 9 --bs-* variables, 3 raw colors
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/modeling/manage/detail/modeling-exercise-detail.component.html` — 7 hits, 235 in imported units
  - `d-flex`×2 → flex / block / grid / inline-block
  - `row`×1, `col-md-8`×1 → grid grid-cols-12 + col-span-* / flex + gap-*
  - `justify-content-center`×1, `justify-content-around`×1 → justify-*
  - `align-items-center`×1 → items-*
  - 1 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## shared — 42 hits, 0 of 2 units Bootstrap-free

- `app/shared/components/unified-feedback/unified-feedback.component.html` — 30 hits
  - `alert`×1 → tum-ui-message
  - PrimeNG: pTooltip → tumUiTooltip
  - `app/shared/components/unified-feedback/unified-feedback.component.scss`: 29 --bs-* variables
- `app/shared/deimos/deimos-date-range-modal.component.html` — 12 hits
  - `d-flex`×4 → flex / block / grid / inline-block
  - `flex-column`×3 → flex-col
  - `text-danger`×3 → text-state-* / bg-state-* / border-state-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `justify-content-end`×1 → justify-*
  - PrimeNG: p-dialog → tum-ui-dialog, pTemplate, p-message → tum-ui-message, p-datepicker → tum-ui-date-picker, pButton → tumUiButton
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## notification — 30 hits, 2 of 6 units Bootstrap-free

- `app/notification/course-notification/course-notification-setting-specification-card/course-notification-setting-specification-card.component.html` — 9 hits, 9 in imported units
  - `form-check`×1, `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `form-switch`×1 → no guideline target
  - `d-flex`×1 → flex / block / grid / inline-block
  - `flex-column`×1 → flex-col
  - `align-items-center`×1 → items-*
  - `app/notification/course-notification/course-notification-setting-specification-card/course-notification-setting-specification-card.component.scss`: 3 --bs-* variables
  - 4 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/notification/course-notification/course-notification-overview/course-notification-overview.component.html` — 8 hits, 16 in imported units
  - `text-secondary`×2 → --text-body-secondary
  - `d-inline-block`×1 → flex / block / grid / inline-block
  - PrimeNG: pButton → tumUiButton, pTooltip → tumUiTooltip
  - `app/notification/course-notification/course-notification-overview/course-notification-overview.component.scss`: 4 --bs-* variables, 1 raw colors
  - 5 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html` — 7 hits
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - PrimeNG: pButton → tumUiButton
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem
  - `app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.scss`: 4 --bs-* variables, 1 raw colors
- `app/notification/course-notification/course-notification/course-notification.component.html` — 6 hits, 3 in imported units
  - `w-100`×1 → w-full / h-full or an explicit size
  - `app/notification/course-notification/course-notification/course-notification.component.scss`: 4 --bs-* variables, 1 raw colors

## editor — 22 hits, 1 of 4 units Bootstrap-free

- `app/editor/monaco-editor/inline-refinement-button/inline-refinement-button.component.html` — 17 hits
  - `d-flex`×5 → flex / block / grid / inline-block
  - `align-items-center`×5 → items-*
  - `flex-shrink-0`×2 → grow / shrink
  - `justify-content-center`×2 → justify-*
  - `w-100`×1 → w-full / h-full or an explicit size
  - `text-danger`×1 → text-state-* / bg-state-* / border-state-*
  - `text-muted`×1 → --text-body-secondary
  - PrimeNG: pButton → tumUiButton
  - 8 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` — 4 hits, 8 in imported units
  - `btn`×1, `btn-sm`×1, `btn-outline-secondary`×1 → tum-ui-button / tumUiButton
  - PrimeNG: p-tabs → tum-ui-tabs, p-tablist, p-tab → tum-ui-tab, pButton → tumUiButton, pTooltip → tumUiTooltip, p-popover → tum-ui-popover, p-tieredmenu, p-tag → tum-ui-tag
  - `app/editor/markdown-editor/monaco/markdown-editor-monaco.component.scss`: 1 --bs-* variables
  - 21 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/editor/monaco-editor/monaco-editor.component.ts` — 1 hit
  - `app/editor/monaco-editor/monaco-editor.component.scss`: 1 raw colors

## sharing — 18 hits, 0 of 1 units Bootstrap-free

- `app/sharing/sharing.component.html` — 18 hits
  - `d-none`×6 → hidden
  - `d-md-table-cell`×6 → md:flex / md:hidden …
  - `table`×2, `table-striped`×2 → tum-ui-table / tumUiTable
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - 2 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## logos — 15 hits, 1 of 2 units Bootstrap-free

- `app/logos/llm-selection-popup.component.html` — 15 hits
  - `card-header`×3 → tum-ui-card / tum-ui-panel
  - `modal-backdrop`×1, `modal-content`×1, `modal-header`×1 → tum-ui-dialog
  - PrimeNG: p-toggleswitch → tum-ui-toggle-switch
  - `app/logos/llm-selection-popup.component.scss`: 8 --bs-* variables, 1 raw colors

## calendar — 8 hits, 9 of 13 units Bootstrap-free

- `app/calendar/desktop/overview/calendar-desktop-overview.component.html` — 4 hits, 1 in imported units
  - `d-flex`×1 → flex / block / grid / inline-block
  - `align-items-center`×1 → items-*
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - PrimeNG: p-multiselect, p-selectbutton → tum-ui-select-button, pButton → tumUiButton, p-buttongroup → tum-ui-button-group
  - 3 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)
- `app/calendar/mobile/overview/calendar-mobile-overview.component.html` — 2 hits, 2 in imported units
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `popover-content`×1 → tum-ui-popover
  - PrimeNG: pButton → tumUiButton, p-popover → tum-ui-popover, p-checkbox → tum-ui-checkbox
- `app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.html` — 1 hit
  - `app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.scss`: 1 raw colors
- `app/calendar/shared/calendar-subscription-popover/calendar-subscription-popover.component.html` — 1 hit
  - `popover-content`×1 → tum-ui-popover
  - PrimeNG: p-popover → tum-ui-popover, p-selectbutton → tum-ui-select-button, p-checkbox → tum-ui-checkbox

## localvc — 6 hits, 1 of 2 units Bootstrap-free

- `app/localvc/repository-view/repository-view.component.html` — 6 hits, 308 in imported units
  - `btn`×2, `btn-primary`×2 → tum-ui-button / tumUiButton
  - `d-flex`×1 → flex / block / grid / inline-block
  - `card-body`×1 → tum-ui-card / tum-ui-panel
  - 2 Bootstrap spacing classes to convert by size (`mb-3` is 1rem in Bootstrap, 0.75rem in Tailwind)

## foundation — 3 hits, 12 of 14 units Bootstrap-free

- `app/foundation/sort/icon/sort-icon.component.html` — 2 hits
  - `d-flex`×1 → flex / block / grid / inline-block
  - `flex-column`×1 → flex-col
- `app/foundation/feature-toggle/feature-toggle-hide.directive.ts` — 1 hit
  - `d-none`×1 → hidden

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
