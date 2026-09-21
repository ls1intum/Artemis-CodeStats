# Artemis client migration brief: localvc

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
- `src/main/webapp/app/shared-ui/delete-dialog/directive/delete-button.directive.ts` ([jhiDeleteButton]): imported by 13 Bootstrap-free units; 3 hits: btn, d-none, d-xl-inline
- `src/main/webapp/app/shared-ui/components/buttons/exercise-action-button/exercise-action-button.component.html` (button[jhi-exercise-action-button]): imported by 8 Bootstrap-free units; 12 hits: btn, btn-outline-primary, btn-sm, btn-primary, btn-secondary, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/components/buttons/code-button/code-button.component.html` (jhi-code-button): imported by 6 Bootstrap-free units; 34 hits: alert, alert-warning, d-flex, btn-group, btn, btn-primary, btn-sm, dropdown-toggle, dropdown-menu, dropdown-item, align-items-center, btn-secondary, btn-success, d-none, d-md-inline
- `src/main/webapp/app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html` (jhi-feedback-suggestion-badge): imported by 5 Bootstrap-free units; 1 hit: badge
- `src/main/webapp/app/shared-ui/grading-instruction-link-icon/grading-instruction-link-icon.component.html` (jhi-grading-instruction-link-icon): imported by 5 Bootstrap-free units; 1 hit: text-danger
- `src/main/webapp/app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html` (jhi-assessment-correction-round-badge): imported by 5 Bootstrap-free units; 2 hits: badge
- `src/main/webapp/app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html` (jhi-exam-exercise-update-highlighter): imported by 5 Bootstrap-free units; 4 hits: btn

## localvc — 6 hits, 1 of 2 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/localvc/repository-view/repository-view.component.html` — 6 hits · route `/courses/:courseId/exercises/:exerciseId/repository/:repositoryId`
  - `btn`×2, `btn-primary`×2 → tum-ui-button / tumUiButton
  - `d-flex`×1 → flex
  - `card-body`×1 → tum-ui-card / tum-ui-panel
  - 2 Bootstrap spacing classes to convert by size
  - imports 33 units with Bootstrap (308 hits): `app/assessment/manage/unreferenced-feedback-detail/assessment-correction-round-badge/assessment-correction-round-badge.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/exam/overview/exercises/exam-exercise-update-highlighter/exam-exercise-update-highlighter.component.html`, `app/exercise/feedback/feedback-suggestion-badge/feedback-suggestion-badge.component.html`, `app/programming/manage/assess/code-editor-tutor-assessment-inline-feedback/code-editor-tutor-assessment-inline-feedback.component.html`, `app/programming/manage/assess/code-editor-tutor-assessment-inline-feedback/suggestion/code-editor-tutor-assessment-inline-feedback-suggestion.component.html`, `app/programming/manage/code-editor/build-output/code-editor-build-output.component.html`, `app/programming/manage/code-editor/container/code-editor-container.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
