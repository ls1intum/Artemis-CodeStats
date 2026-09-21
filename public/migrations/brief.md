# Artemis client migration brief

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
- `src/main/webapp/app/lti/overview` (3 units)
  ```
  'src/main/webapp/app/lti/overview/**/*.html',
  "src/main/webapp/app/lti/overview/**/*.scss",
  @source './app/lti/overview';
  ```
- `src/main/webapp/app/communication/emoji` (2 units)
  ```
  'src/main/webapp/app/communication/emoji/**/*.html',
  "src/main/webapp/app/communication/emoji/**/*.scss",
  @source './app/communication/emoji';
  ```
- `src/main/webapp/app/exercise/review` (2 units)
  ```
  'src/main/webapp/app/exercise/review/**/*.html',
  "src/main/webapp/app/exercise/review/**/*.scss",
  @source './app/exercise/review';
  ```
- `src/main/webapp/app/plagiarism/manage/plagiarism-run-details` (2 units)
  ```
  'src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.html',
  "src/main/webapp/app/plagiarism/manage/plagiarism-run-details/**/*.scss",
  @source './app/plagiarism/manage/plagiarism-run-details';
  ```
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
- `src/main/webapp/app/atlas/manage/taxonomy-select` (1 unit)
  ```
  'src/main/webapp/app/atlas/manage/taxonomy-select/**/*.html',
  "src/main/webapp/app/atlas/manage/taxonomy-select/**/*.scss",
  @source './app/atlas/manage/taxonomy-select';
  ```
- `src/main/webapp/app/atlas/shared/competency-rings` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/competency-rings/**/*.html',
  "src/main/webapp/app/atlas/shared/competency-rings/**/*.scss",
  @source './app/atlas/shared/competency-rings';
  ```
- `src/main/webapp/app/atlas/shared/dag-graph` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/dag-graph/**/*.html',
  "src/main/webapp/app/atlas/shared/dag-graph/**/*.scss",
  @source './app/atlas/shared/dag-graph';
  ```
- `src/main/webapp/app/atlas/shared/orchestration-result-dialog` (1 unit)
  ```
  'src/main/webapp/app/atlas/shared/orchestration-result-dialog/**/*.html',
  "src/main/webapp/app/atlas/shared/orchestration-result-dialog/**/*.scss",
  @source './app/atlas/shared/orchestration-result-dialog';
  ```
- `src/main/webapp/app/calendar/desktop/month-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/desktop/month-presentation/**/*.html',
  "src/main/webapp/app/calendar/desktop/month-presentation/**/*.scss",
  @source './app/calendar/desktop/month-presentation';
  ```
- `src/main/webapp/app/calendar/desktop/week-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/desktop/week-presentation/**/*.html',
  "src/main/webapp/app/calendar/desktop/week-presentation/**/*.scss",
  @source './app/calendar/desktop/week-presentation';
  ```
- `src/main/webapp/app/calendar/mobile/month-presentation` (1 unit)
  ```
  'src/main/webapp/app/calendar/mobile/month-presentation/**/*.html',
  "src/main/webapp/app/calendar/mobile/month-presentation/**/*.scss",
  @source './app/calendar/mobile/month-presentation';
  ```
- `src/main/webapp/app/calendar/shared/calendar-day-badge` (1 unit)
  ```
  'src/main/webapp/app/calendar/shared/calendar-day-badge/**/*.html',
  "src/main/webapp/app/calendar/shared/calendar-day-badge/**/*.scss",
  @source './app/calendar/shared/calendar-day-badge';
  ```
- `src/main/webapp/app/calendar/shared/calendar-event-detail-popover-component` (1 unit)
  ```
  'src/main/webapp/app/calendar/shared/calendar-event-detail-popover-component/**/*.html',
  "src/main/webapp/app/calendar/shared/calendar-event-detail-popover-component/**/*.scss",
  @source './app/calendar/shared/calendar-event-detail-popover-component';
  ```
- … 60 more directories in the JSON brief

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
- `src/main/webapp/app/foundation/feature-toggle/feature-toggle-hide.directive.ts` ([jhiFeatureToggleHide]): imported by 8 Bootstrap-free units; 1 hit: d-none

## Global shell

- `src/main/webapp/app/app.component.html` and what it imports (navbar, footer, overlays) carry 155 hits and render on every page. Pages count as ready without it; the shell is its own migration.

## Sections

- course: 984 hits in 60 units, 24 of 84 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/course.md
- programming: 981 hits in 78 units, 32 of 110 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/programming.md
- exercise: 910 hits in 62 units, 34 of 96 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/exercise.md
- exam: 906 hits in 65 units, 21 of 86 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/exam.md
- atlas: 786 hits in 50 units, 15 of 65 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/atlas.md
- quiz: 750 hits in 33 units, 15 of 48 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/quiz.md
- communication: 711 hits in 46 units, 14 of 60 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/communication.md
- lecture: 583 hits in 31 units, 13 of 44 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/lecture.md
- assessment: 416 hits in 25 units, 12 of 37 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/assessment.md
- core: 311 hits in 26 units, 15 of 41 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/core.md
- shared-ui: 305 hits in 38 units, 39 of 76 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/shared-ui.md
- plagiarism: 217 hits in 12 units, 3 of 15 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/plagiarism.md
- text: 206 hits in 13 units, 3 of 16 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/text.md
- tutorialgroup: 150 hits in 4 units, 28 of 32 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/tutorialgroup.md
- iris: 120 hits in 14 units, 8 of 22 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/iris.md
- fileupload: 72 hits in 4 units, 0 of 4 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/fileupload.md
- lti: 59 hits in 3 units, 3 of 6 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/lti.md
- modeling: 54 hits in 3 units, 16 of 19 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/modeling.md
- shared: 42 hits in 2 units, 0 of 2 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/shared.md
- notification: 30 hits in 4 units, 2 of 6 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/notification.md
- editor: 22 hits in 3 units, 1 of 4 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/editor.md
- sharing: 18 hits in 1 unit, 0 of 1 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/sharing.md
- logos: 15 hits in 1 unit, 1 of 2 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/logos.md
- calendar: 8 hits in 4 units, 9 of 13 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/calendar.md
- localvc: 6 hits in 1 unit, 1 of 2 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/localvc.md
- foundation: 3 hits in 2 units, 12 of 14 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/foundation.md
- account: 0 hits in 0 units, 33 of 33 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/account.md
- admin: 0 hits in 0 units, 54 of 54 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/admin.md
- app: 0 hits in 0 units, 1 of 1 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/app.md
- localci: 0 hits in 0 units, 11 of 11 Bootstrap-free — brief: https://ls1intum.github.io/Artemis-CodeStats/migrations/brief/localci.md

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
