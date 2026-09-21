# Artemis client migration brief: plagiarism

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

- `src/main/webapp/app/plagiarism/manage/plagiarism-run-details` (2 units)
  ```
  'src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.html',
  "src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.scss",
  @source './app/plagiarism/manage/plagiarism-run-details';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/communication/posting-button/posting-button.component.html` (button[jhi-posting-button]): imported by 10 Bootstrap-free units; 3 hits: btn, btn-outline-primary, btn-sm
- `src/main/webapp/app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html` (jhi-redirect-to-iris-button): imported by 10 Bootstrap-free units; 3 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` (jhi-markdown-editor-monaco): imported by 10 Bootstrap-free units; 4 hits: btn, btn-sm, btn-outline-secondary
- `src/main/webapp/app/shared-ui/confirm-icon/confirm-icon.component.html` (jhi-confirm-icon): imported by 7 Bootstrap-free units; 1 hit: text-danger
- `src/main/webapp/app/communication/posting-markdown-editor/posting-markdown-editor.component.html` (jhi-posting-markdown-editor): imported by 4 Bootstrap-free units; 3 hits: col-12, w-100, col
- `src/main/webapp/app/communication/posting-content/posting-content.component.html` (jhi-posting-content): imported by 4 Bootstrap-free units; 6 hits: d-inline-flex, align-items-center, text-secondary, btn, btn-outline-primary, btn-sm

## plagiarism — 217 hits, 3 of 15 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.html` — 1 hit
  - ng-bootstrap: ngbDropdown, ngbDropdownItem
  - `src/main/webapp/app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.scss`: 1 --bs-* variables
- `src/main/webapp/app/plagiarism/manage/plagiarism-sidebar/plagiarism-sidebar.component.html` — 2 hits
  - `text-warning`×2 → text-state-warning
- `src/main/webapp/app/plagiarism/shared/verdict/plagiarism-case-verdict.component.html` — 7 hits
  - `badge`×3 → tum-ui-tag
  - `bg-success`×2 → bg-state-success
  - `bg-danger`×2 → bg-state-danger
  - ng-bootstrap: ngbTooltip
  - 7 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/plagiarism/manage/plagiarism-header/plagiarism-header.component.html` — 11 hits
  - `btn`×3, `btn-sm`×3, `btn-primary`×1, `btn-success`×1, `btn-danger`×1 → tum-ui-button / tumUiButton
  - `text-secondary`×1 → --text-body-secondary
  - `src/main/webapp/app/plagiarism/manage/plagiarism-header/plagiarism-header.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/plagiarism/manage/exercise-update-plagiarism/exercise-update-plagiarism.component.html` — 55 hits
  - `form-group`×5, `form-control-label`×4, `form-text`×4 → tum-ui-form-field
  - `col-12`×4 → col-span-12
  - `col-md-6`×4 → md:col-span-6
  - `col-xl-3`×4 → xl:col-span-3
  - `d-flex`×4 → flex
  - `flex-column`×4 → flex-col
  - `h-100`×4 → h-full
  - `form-control`×4 → tumUiInput
  - `text-danger`×4 → text-state-danger
  - `row`×2 → grid grid-cols-12 (or flex)
  - `form-check`×2, `form-check-input`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `border-warning`×1 → border-state-warning
  - `btn`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `badge`×1 → tum-ui-tag
  - ng-bootstrap: ngbTooltip
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/plagiarism/manage/plagiarism-split-view/text-submission-viewer/text-submission-viewer.component.html` — 3 hits
  - `text-warning`×1 → text-state-warning
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - 1 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.html`
- `src/main/webapp/app/plagiarism/manage/plagiarism-split-view/plagiarism-split-view.component.html` — 6 hits
  - `btn`×1, `btn-sm`×1 → tum-ui-button / tumUiButton
  - PrimeNG: p-splitter, pTooltip → tumUiTooltip
  - `src/main/webapp/app/plagiarism/manage/plagiarism-split-view/plagiarism-split-view.component.scss`: 4 --bs-* variables
  - imports 2 units with Bootstrap (4 hits): `app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.html`, `app/plagiarism/manage/plagiarism-split-view/text-submission-viewer/text-submission-viewer.component.html`
- `src/main/webapp/app/plagiarism/shared/review/plagiarism-case-review.component.html` — 4 hits
  - `nav-tabs`×1 → tum-ui-tabs
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col`×1 → flex-1
  - `btn-sm`×1 → tum-ui-button / tumUiButton
  - ng-bootstrap: ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 3 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (10 hits): `app/plagiarism/manage/plagiarism-split-view/plagiarism-split-view.component.html`, `app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.html`, `app/plagiarism/manage/plagiarism-split-view/text-submission-viewer/text-submission-viewer.component.html`
- `src/main/webapp/app/plagiarism/manage/instructor-view/plagiarism-cases-instructor-view.component.html` — 16 hits · route `/course-management/:courseId/plagiarism-cases`
  - `col-3`×9 → col-span-3
  - `row`×2 → grid grid-cols-12 (or flex)
  - `card`×1, `card-header`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `col-1`×1 → col-span-1
  - `col-2`×1 → col-span-2
  - 4 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (10 hits): `app/exercise/dashboards/tutor-participation-graph/progress-bar/progress-bar.component.html`, `app/plagiarism/shared/verdict/plagiarism-case-verdict.component.html`
- `src/main/webapp/app/plagiarism/manage/plagiarism-inspector/plagiarism-inspector.component.html` — 33 hits · route `/course-management/:courseId/exams/:examId/exercise-groups/:exerciseGroupId/text-exercises/:exerciseId/plagiarism`
  - `btn`×5, `btn-danger`×2, `btn-info`×1, `btn-primary`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `form-check`×4, `form-check-input`×4, `form-check-label`×3 → tum-ui-checkbox / tum-ui-radio-button
  - `form-control`×3 → tumUiInput
  - `flex-grow-0`×1 → grow-0
  - `text-warning`×1 → text-state-warning
  - `btn-block`×1 → custom class: rename (banned by prefix only)
  - `d-flex`×1 → flex
  - `flex-column`×1 → flex-col
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `align-self-center`×1 → self-center
  - `visually-hidden`×1 → sr-only
  - PrimeNG: p-dialog → tum-ui-dialog
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbTooltip
  - `src/main/webapp/app/plagiarism/manage/plagiarism-inspector/plagiarism-inspector.component.scss`: 1 raw colors
  - 1 Bootstrap spacing classes to convert by size
  - imports 5 units with Bootstrap (23 hits): `app/plagiarism/manage/plagiarism-header/plagiarism-header.component.html`, `app/plagiarism/manage/plagiarism-sidebar/plagiarism-sidebar.component.html`, `app/plagiarism/manage/plagiarism-split-view/plagiarism-split-view.component.html`, `app/plagiarism/manage/plagiarism-split-view/split-pane-header/split-pane-header.component.html`, `app/plagiarism/manage/plagiarism-split-view/text-submission-viewer/text-submission-viewer.component.html`
- `src/main/webapp/app/plagiarism/overview/detail-view/plagiarism-case-student-detail-view.component.html` — 36 hits · route `/courses/:courseId/plagiarism-cases/:plagiarismCaseId`
  - `col-12`×6 → col-span-12
  - `col-lg-6`×4 → lg:col-span-6
  - `col-xl-3`×4 → xl:col-span-3
  - `d-flex`×4 → flex
  - `row`×3 → grid grid-cols-12 (or flex)
  - `align-items-center`×3 → items-center
  - `alert`×3, `alert-danger`×2, `alert-warning`×1 → tum-ui-message
  - `text-truncate`×2 → truncate
  - `flex-column`×1 → flex-col
  - `justify-content-xl-end`×1 → xl:justify-end
  - `btn`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - 9 Bootstrap spacing classes to convert by size
  - imports 25 units with Bootstrap (194 hits): `app/communication/answer-post/answer-post.component.html`, `app/communication/course-conversations-components/forward-message-dialog/forward-message-dialog.component.html`, `app/communication/forwarded-message/forwarded-message.component.html`, `app/communication/message/message-inline-input/message-inline-input.component.html`, `app/communication/post/post.component.html`, `app/communication/posting-button/posting-button.component.html`, `app/communication/posting-content/posting-content-part/posting-content-part.component.html`, `app/communication/posting-content/posting-content.component.html`, …
- `src/main/webapp/app/plagiarism/manage/instructor-view/detail-view/plagiarism-case-instructor-detail-view.component.html` — 43 hits · route `/course-management/:courseId/plagiarism-cases/:plagiarismCaseId`
  - `col-12`×4 → col-span-12
  - `col-lg-6`×4 → lg:col-span-6
  - `col-xl-3`×4 → xl:col-span-3
  - `d-flex`×4 → flex
  - `btn`×4, `btn-primary`×3, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `align-items-center`×3 → items-center
  - `text-truncate`×2 → truncate
  - `btn-group`×2 → tum-ui-button-group
  - `form-control`×2 → tumUiInput
  - `row`×1 → grid grid-cols-12 (or flex)
  - `flex-column`×1 → flex-col
  - `justify-content-xl-end`×1 → xl:justify-end
  - `dropdown-toggle-split`×1, `dropdown-menu`×1 → tum-ui-menu
  - `btn-md`×1 → custom class: rename (banned by prefix only)
  - `nav-tabs`×1 → tum-ui-tabs
  - `input-group`×1, `input-group-text`×1 → tum-ui-input-group
  - `form-group`×1 → tum-ui-form-field
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem, ngbNav, ngbNavItem, ngbNavLink, ngbNavContent, ngbNavOutlet
  - 10 Bootstrap spacing classes to convert by size
  - imports 26 units with Bootstrap (198 hits): `app/communication/answer-post/answer-post.component.html`, `app/communication/course-conversations-components/forward-message-dialog/forward-message-dialog.component.html`, `app/communication/forwarded-message/forwarded-message.component.html`, `app/communication/message/message-inline-input/message-inline-input.component.html`, `app/communication/post/post.component.html`, `app/communication/posting-button/posting-button.component.html`, `app/communication/posting-content/posting-content-part/posting-content-part.component.html`, `app/communication/posting-content/posting-content.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
