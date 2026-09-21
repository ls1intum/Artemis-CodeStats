# Artemis client migration brief: shared-ui

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

- `src/main/webapp/app/shared-ui/close-circle` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/close-circle/**/*.html',
  "src/main/webapp/app/shared-ui/close-circle/**/*.scss",
  @source './app/shared-ui/close-circle';
  ```
- `src/main/webapp/app/shared-ui/color-selector` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/color-selector/**/*.html',
  "src/main/webapp/app/shared-ui/color-selector/**/*.scss",
  @source './app/shared-ui/color-selector';
  ```
- `src/main/webapp/app/shared-ui/components/checklist-check` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/components/checklist-check/**/*.html',
  "src/main/webapp/app/shared-ui/components/checklist-check/**/*.scss",
  @source './app/shared-ui/components/checklist-check';
  ```
- `src/main/webapp/app/shared-ui/components/documentation-link` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/components/documentation-link/**/*.html',
  "src/main/webapp/app/shared-ui/components/documentation-link/**/*.scss",
  @source './app/shared-ui/components/documentation-link';
  ```
- `src/main/webapp/app/shared-ui/components/slice-navigator` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/components/slice-navigator/**/*.html',
  "src/main/webapp/app/shared-ui/components/slice-navigator/**/*.scss",
  @source './app/shared-ui/components/slice-navigator';
  ```
- `src/main/webapp/app/shared-ui/connection-warning` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/connection-warning/**/*.html',
  "src/main/webapp/app/shared-ui/connection-warning/**/*.scss",
  @source './app/shared-ui/connection-warning';
  ```
- `src/main/webapp/app/shared-ui/detail-overview-list/components/boolean-detail` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/detail-overview-list/components/boolean-detail/**/*.html',
  "src/main/webapp/app/shared-ui/detail-overview-list/components/boolean-detail/**/*.scss",
  @source './app/shared-ui/detail-overview-list/components/boolean-detail';
  ```
- `src/main/webapp/app/shared-ui/detail-overview-list/components/date-detail` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/detail-overview-list/components/date-detail/**/*.html',
  "src/main/webapp/app/shared-ui/detail-overview-list/components/date-detail/**/*.scss",
  @source './app/shared-ui/detail-overview-list/components/date-detail';
  ```
- `src/main/webapp/app/shared-ui/detail-overview-list/components/link-detail` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/detail-overview-list/components/link-detail/**/*.html',
  "src/main/webapp/app/shared-ui/detail-overview-list/components/link-detail/**/*.scss",
  @source './app/shared-ui/detail-overview-list/components/link-detail';
  ```
- `src/main/webapp/app/shared-ui/detail-overview-list/components/text-detail` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/detail-overview-list/components/text-detail/**/*.html',
  "src/main/webapp/app/shared-ui/detail-overview-list/components/text-detail/**/*.scss",
  @source './app/shared-ui/detail-overview-list/components/text-detail';
  ```
- `src/main/webapp/app/shared-ui/loading-indicator-overlay` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/loading-indicator-overlay/**/*.html',
  "src/main/webapp/app/shared-ui/loading-indicator-overlay/**/*.scss",
  @source './app/shared-ui/loading-indicator-overlay';
  ```
- `src/main/webapp/app/shared-ui/range-slider` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/range-slider/**/*.html',
  "src/main/webapp/app/shared-ui/range-slider/**/*.scss",
  @source './app/shared-ui/range-slider';
  ```
- `src/main/webapp/app/shared-ui/search-filter` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/search-filter/**/*.html',
  "src/main/webapp/app/shared-ui/search-filter/**/*.scss",
  @source './app/shared-ui/search-filter';
  ```
- `src/main/webapp/app/shared-ui/virtual-scroll` (1 unit)
  ```
  'src/main/webapp/app/shared-ui/virtual-scroll/**/*.html',
  "src/main/webapp/app/shared-ui/virtual-scroll/**/*.scss",
  @source './app/shared-ui/virtual-scroll';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/directives/resizable.directive.ts` ([jhiResizable]): imported by 16 Bootstrap-free units; 1 hit: card-resizable
- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` (button[jhi-exercise-action-button]): imported by 8 Bootstrap-free units; 12 hits: btn, btn-outline-primary, btn-sm, btn-primary, btn-secondary, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/components/buttons/code-button/code-button.component.html` (jhi-code-button): imported by 6 Bootstrap-free units; 34 hits: alert, alert-warning, d-flex, btn-group, btn, btn-primary, btn-sm, dropdown-toggle, dropdown-menu, dropdown-item, align-items-center, btn-secondary, btn-success, d-none, d-md-inline
- `src/main/webapp/app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html` (jhi-exam-exercise-update-highlighter): imported by 5 Bootstrap-free units; 4 hits: btn
- `src/main/webapp/app/programming/shared/instructions-render/step-wizard/programming-exercise-instruction-step-wizard.component.html` (jhi-programming-exercise-instructions-step-wizard): imported by 5 Bootstrap-free units; 7 hits: btn, btn-circle, text-success, text-danger
- `src/main/webapp/app/programming/shared/instructions-render/task/programming-exercise-instruction-task-status.component.html` (jhi-programming-exercise-instructions-task-status): imported by 5 Bootstrap-free units; 7 hits: text-success, text-danger, text-secondary

## shared-ui — 305 hits, 39 of 76 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/shared-ui/components/feature-overlay/feature-overlay.component.ts` — 1 hit
  - `d-inline-block`×1 → inline-block
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/shared-ui/confirm-icon/confirm-icon.component.html` — 1 hit
  - `text-danger`×1 → text-state-danger
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/shared-ui/directives/resizable.directive.ts` — 1 hit
  - `card-resizable`×1 → custom class: rename (banned by prefix only)
- `src/main/webapp/app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html` — 1 hit
  - `text-danger`×1 → text-state-danger
  - ng-bootstrap: ngbTooltip
- `src/main/webapp/app/shared-ui/table-view/table-view.html` — 1 hit
  - `text-secondary`×1 → --text-body-secondary
  - PrimeNG: p-table → tum-ui-table, p-sortIcon, p-columnfilter, p-tableHeaderCheckbox, pFrozenColumn, pSortableColumn → tumUiSortableColumn, pTooltip → tumUiTooltip, p-tableCheckbox
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/table/editable-checkbox/table-editable-checkbox.component.ts` — 1 hit
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
- `src/main/webapp/app/shared-ui/textarea/textarea-counter.component.html` — 1 hit
  - `badge`×1 → tum-ui-tag
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/components/not-released-tag/not-released-tag.component.html` — 2 hits
  - `badge`×1 → tum-ui-tag
  - `bg-warning`×1 → bg-state-warning
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/detail-overview-list/components/exercise-categories-detail/exercise-categories-detail.component.html` — 2 hits
  - `badge`×1 → tum-ui-tag
  - `src/main/webapp/app/shared-ui/detail-overview-list/components/exercise-categories-detail/exercise-categories-detail.component.scss`: 1 raw colors
- `src/main/webapp/app/shared-ui/detail-overview-navigation-bar/detail-overview-navigation-bar.component.html` — 2 hits
  - `src/main/webapp/app/shared-ui/detail-overview-navigation-bar/detail-overview-navigation-bar.scss`: 2 --bs-* variables
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` — 3 hits (locked path)
  - `btn`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-xl-inline`×1 → xl:inline
- `src/main/webapp/app/shared-ui/information-box/information-box.component.html` — 3 hits
  - `h-100`×1 → h-full
  - `text-body-tertiary`×1, `text-body`×1 → --text-body-secondary
  - ng-bootstrap: ngbTooltip
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` — 3 hits
  - `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.scss`: 3 raw colors
- `src/main/webapp/app/shared-ui/card-wrapper/card-wrapper.component.html` — 4 hits
  - `card`×1, `card-header`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `w-100`×1 → w-full
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/connection-status/connection-status.component.html` — 4 hits
  - `badge`×2 → tum-ui-tag
  - `bg-success`×1 → bg-state-success
  - `bg-danger`×1 → bg-state-danger
- `src/main/webapp/app/shared-ui/loading-indicator-container/loading-indicator-container.component.html` — 4 hits
  - `d-flex`×1 → flex
  - `justify-content-center`×1 → justify-center
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
- `src/main/webapp/app/shared-ui/side-panel/side-panel.component.html` — 4 hits
  - `row`×1 → grid grid-cols-12 (or flex)
  - `g-0`×1 → gap-0 (convert by size)
  - `col-7`×1 → col-span-7
  - `col-5`×1 → col-span-5
- `src/main/webapp/app/shared-ui/table/editable-field/table-editable-field.component.html` — 4 hits
  - `row`×1 → grid grid-cols-12 (or flex)
  - `form-control`×1 → tumUiInput
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` — 5 hits
  - `w-100`×1 → w-full
  - `btn`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - `d-xl-inline`×1 → xl:inline
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/components/buttons/course-exam-archive-button/course-exam-archive-dialog.component.ts` — 7 hits
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `btn`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
- `src/main/webapp/app/shared-ui/components/buttons/course-exam-archive-button/course-exam-archive-dialog.component.ts` — 7 hits
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `btn`×1, `btn-warning`×1 → tum-ui-button / tumUiButton
- `src/main/webapp/app/shared-ui/form/form-status-bar/form-status-bar.component.html` — 7 hits
  - `d-flex`×2 → flex
  - `justify-content-between`×1 → justify-between
  - `flex-column`×1 → flex-col
  - `align-items-center`×1 → items-center
  - `d-none`×1 → hidden
  - `d-sm-inline`×1 → sm:inline
  - 2 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/timeline/timeline.component.html` — 7 hits
  - PrimeNG: p-datepicker → tum-ui-date-picker, pTooltip → tumUiTooltip
  - `src/main/webapp/app/shared-ui/timeline/timeline.component.scss`: 7 --bs-* variables
- `src/main/webapp/app/shared-ui/components/buttons/course-exam-archive-button/course-exam-archive-dialog.component.ts` — 8 hits
  - `btn`×2, `btn-warning`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
- `src/main/webapp/app/shared-ui/components/confirm-autofocus-modal/confirm-autofocus-modal.component.html` — 9 hits
  - `btn`×2, `btn-outline-secondary`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/image-cropper/component/image-cropper.component.html` — 10 hits
  - `src/main/webapp/app/shared-ui/image-cropper/component/image-cropper.component.scss`: 10 raw colors
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` — 12 hits
  - `btn`×1, `btn-outline-primary`×1, `btn-sm`×1, `btn-primary`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - `d-xl-inline`×1 → xl:inline
  - `src/main/webapp/app/course/overview/course-overview/course-overview.scss`: 4 raw colors (shared by 13 units)
- `src/main/webapp/app/shared-ui/form/title-channel-name-primeng/title-channel-name-primeng.component.html` — 12 hits
  - `form-group`×2, `form-control-label`×2 → tum-ui-form-field
  - `col-lg-6`×2 → lg:col-span-6
  - `w-100`×2 → w-full
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-12`×1 → col-span-12
  - `alert`×1, `alert-danger`×1 → tum-ui-message
  - PrimeNG: pInputText
- `src/main/webapp/app/shared-ui/form/title-channel-name/title-channel-name.component.html` — 12 hits
  - `form-group`×2, `form-control-label`×2 → tum-ui-form-field
  - `col-lg-6`×2 → lg:col-span-6
  - `form-control`×2 → tumUiInput
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-12`×1 → col-span-12
  - `alert`×1, `alert-danger`×1 → tum-ui-message
- `src/main/webapp/app/shared-ui/export/modal/export-modal.component.html` — 34 hits
  - `form-group`×5, `form-control-label`×3 → tum-ui-form-field
  - `btn`×5, `btn-primary`×3, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `btn-group`×3 → tum-ui-button-group
  - `btn-default`×3 → custom class: rename (banned by prefix only)
  - `modal-header`×1, `modal-title`×1, `modal-body`×1, `modal-footer`×1 → tum-ui-dialog
  - `btn-close`×1 → tum-ui-button
  - `nav-tabs`×1 → tum-ui-tabs
  - `justify-content-between`×1 → justify-between
  - `flex-grow-1`×1 → grow
  - `d-flex`×1 → flex
  - `justify-content-end`×1 → justify-end
  - ng-bootstrap: ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/components/resizable-panels/resizable-panels.component.html` — 46 hits
  - `d-flex`×5 → flex
  - `w-100`×4 → w-full
  - `h-100`×4 → h-full
  - `flex-column`×4 → flex-col
  - `flex-grow-1`×4 → grow
  - `align-items-center`×2 → items-center
  - `flex-shrink-0`×1 → shrink-0
  - PrimeNG: p-splitter, p-tabs → tum-ui-tabs, p-tablist, p-tab → tum-ui-tab
  - `src/main/webapp/app/shared-ui/components/resizable-panels/resizable-panels.component.scss`: 22 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/shared-ui/resizeable-container/resizeable-container.component.html` — 10 hits
  - `card`×2, `card-header`×2, `card-body`×2, `card-title`×1 → tum-ui-card / tum-ui-panel
  - `flex-grow-1`×1 → grow
  - `flex-fill`×1 → flex-1
  - `src/main/webapp/app/shared-ui/resizeable-container/resizeable-container.component.scss`: 1 --bs-* variables
  - 2 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/shared-ui/directives/resizable.directive.ts`
- `src/main/webapp/app/shared-ui/feature-activation/feature-activation.component.html` — 14 hits
  - `d-flex`×3 → flex
  - `align-items-center`×2 → items-center
  - `justify-content-center`×2 → justify-center
  - `card`×1, `card-header`×1, `card-body`×1, `card-footer`×1 → tum-ui-card / tum-ui-panel
  - `row`×1 → grid grid-cols-12 (or flex)
  - `g-4`×1 → gap-4 (convert by size)
  - `col-md-12`×1 → md:col-span-12
  - 13 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (5 hits): `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/shared-ui/detail-overview-list/components/programming-test-status-detail/programming-test-status-detail.component.html` — 2 hits
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - 3 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (7 hits): `app/programming/manage/status/programming-exercise-instructor-status.component.html`, `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/shared-ui/form/form-footer/form-footer.component.html` — 7 hits
  - `d-flex`×2 → flex
  - `align-items-center`×1 → items-center
  - `flex-grow-1`×1 → grow
  - `w-100`×1 → w-full
  - `badge`×1 → tum-ui-tag
  - `align-content-center`×1 → content-center
  - ng-bootstrap: ngbTooltip
  - 3 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (7 hits): `app/exercise/exercise-update-notification/exercise-update-notification.component.html`, `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/shared-ui/components/buttons/code-button/code-button.component.html` — 34 hits
  - `btn`×6, `btn-sm`×6, `btn-primary`×5, `btn-secondary`×1, `btn-success`×1 → tum-ui-button / tumUiButton
  - `dropdown-item`×3, `dropdown-toggle`×1, `dropdown-menu`×1 → tum-ui-menu
  - `alert`×2, `alert-warning`×2 → tum-ui-message
  - `d-flex`×2 → flex
  - `btn-group`×1 → tum-ui-button-group
  - `align-items-center`×1 → items-center
  - `d-none`×1 → hidden
  - `d-md-inline`×1 → md:inline
  - ng-bootstrap: ngbPopover, ngbDropdown, ngbDropdownToggle, ngbDropdownMenu
  - 4 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (12 hits): `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html`
- `src/main/webapp/app/shared-ui/detail-overview-list/components/programming-auxiliary-repository-buttons-detail/programming-auxiliary-repository-buttons-detail.component.html` — 1 hit
  - `text-warning`×1 → text-state-warning
  - ng-bootstrap: ngbTooltip
  - 4 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (51 hits): `app/shared-ui/components/buttons/button/button.component.html`, `app/shared-ui/components/buttons/code-button/code-button.component.html`, `app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html`
- `src/main/webapp/app/shared-ui/detail-overview-list/detail-overview-list.component.html` — 5 hits
  - `col-md-6`×2 → md:col-span-6
  - `btn`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `src/main/webapp/app/shared-ui/detail-overview-list/detail-overview-list.component.scss`: 1 --bs-* variables
  - 7 Bootstrap spacing classes to convert by size
  - imports 24 units with Bootstrap (168 hits): `app/assessment/manage/structured-grading-instructions-assessment-layout/structured-grading-instructions-assessment-layout.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/programming/manage/build-plan-editor/build-phases-editor/build-phase/build-phase-editor.component.html`, `app/programming/manage/build-plan-editor/build-phases-editor/monaco-editor-auto-size/monaco-editor-fit-text.component.html`, `app/programming/manage/status/programming-exercise-instructor-status.component.html`, `app/programming/shared/build-details/programming-exercise-repository-and-build-plan-details/programming-exercise-repository-and-build-plan-details.component.html`, `app/programming/shared/git-diff-report/git-diff-file-panel-title/git-diff-file-panel-title.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
