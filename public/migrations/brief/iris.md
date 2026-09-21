# Artemis client migration brief: iris

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

- `src/main/webapp/app/iris/overview/base-chatbot/chat-status-bar` (1 unit)
  ```
  'src/main/webapp/app/iris/overview/base-chatbot/chat-status-bar/**/*.html',
  "src/main/webapp/app/iris/overview/base-chatbot/chat-status-bar/**/*.scss",
  @source './app/iris/overview/base-chatbot/chat-status-bar';
  ```
- `src/main/webapp/app/iris/overview/citation-text` (1 unit)
  ```
  'src/main/webapp/app/iris/overview/citation-text/**/*.html',
  "src/main/webapp/app/iris/overview/citation-text/**/*.scss",
  @source './app/iris/overview/citation-text';
  ```
- `src/main/webapp/app/iris/overview/point-out-marker` (1 unit)
  ```
  'src/main/webapp/app/iris/overview/point-out-marker/**/*.html',
  "src/main/webapp/app/iris/overview/point-out-marker/**/*.scss",
  @source './app/iris/overview/point-out-marker';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/course/shared/course-sidebar-toggle-button/course-sidebar-toggle-button.component.html` (jhi-course-sidebar-toggle-button): imported by 8 Bootstrap-free units; 15 hits: btn-sidebar-collapse, btn-sidebar-collapse-icon, d-flex, justify-content-center, align-items-center, btn-sidebar-collapse-chevron, btn-sidebar-collapse-chevron-start
- `src/main/webapp/app/iris/overview/base-chatbot/iris-activity-feed/iris-activity-feed.component.html` (jhi-iris-activity-feed): imported by 5 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/iris/overview/base-chatbot/memories-indicator/iris-chat-memories-indicator.component.html` (jhi-iris-chat-memories-indicator): imported by 5 Bootstrap-free units; 2 hits: SCSS only
- `src/main/webapp/app/iris/overview/context-selection/context-selection.component.html` (jhi-context-selection): imported by 5 Bootstrap-free units; 2 hits: SCSS only
- `src/main/webapp/app/iris/overview/base-chatbot/chat-history-item/chat-history-item.component.html` (jhi-chat-history-item): imported by 5 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/iris/overview/context-selection/iris-context-switch-divider.component.html` (jhi-iris-context-switch-divider): imported by 5 Bootstrap-free units; 4 hits: SCSS only
- `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-carousel.component.html` (jhi-iris-mcq-carousel): imported by 5 Bootstrap-free units; 7 hits: carousel-header, carousel-navigation, carousel-dots, carousel-counter
- `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-question.component.html` (jhi-iris-mcq-question): imported by 5 Bootstrap-free units; 8 hits: SCSS only

## iris — 120 hits, 8 of 22 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/iris/overview/base-chatbot/iris-activity-feed/iris-activity-feed.component.html` — 1 hit
  - `src/main/webapp/app/iris/overview/base-chatbot/iris-activity-feed/iris-activity-feed.component.scss`: 1 --bs-* variables
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` — 1 hit
  - `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.scss`: 1 raw colors
- `src/main/webapp/app/iris/overview/base-chatbot/memories-indicator/iris-chat-memories-indicator.component.html` — 2 hits
  - PrimeNG: pTooltip → tumUiTooltip, p-popover → tum-ui-popover
  - `src/main/webapp/app/iris/overview/base-chatbot/memories-indicator/iris-chat-memories-indicator.component.scss`: 2 --bs-* variables
- `src/main/webapp/app/iris/overview/context-selection/context-selection.component.html` — 2 hits
  - PrimeNG: pTooltip → tumUiTooltip, p-select → tum-ui-select, p-chip → tum-ui-chip
  - `src/main/webapp/app/iris/overview/context-selection/context-selection.component.scss`: 2 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/iris/overview/iris-onboarding-modal/stepper/stepper.component.ts` — 2 hits
  - `src/main/webapp/app/iris/overview/iris-onboarding-modal/stepper/stepper.component.scss`: 2 --bs-* variables
- `src/main/webapp/app/iris/overview/base-chatbot/chat-history-item/chat-history-item.component.html` — 3 hits
  - PrimeNG: pTooltip → tumUiTooltip, p-menu → tum-ui-menu
  - `src/main/webapp/app/iris/overview/base-chatbot/chat-history-item/chat-history-item.component.scss`: 3 --bs-* variables
  - 1 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/iris/overview/base-chatbot/iris-thinking-bubble/iris-thinking-bubble.component.html` — 3 hits
  - `src/main/webapp/app/iris/overview/base-chatbot/iris-thinking-bubble/iris-thinking-bubble.component.scss`: 3 --bs-* variables
- `src/main/webapp/app/iris/overview/context-selection/iris-context-switch-divider.component.html` — 4 hits
  - `src/main/webapp/app/iris/overview/context-selection/iris-context-switch-divider.component.scss`: 4 --bs-* variables
- `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-question.component.html` — 8 hits
  - `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-question.component.scss`: 8 --bs-* variables
- `src/main/webapp/app/iris/overview/iris-logo-button/iris-logo-button.component.html` — 1 hit
  - `btn`×1 → tum-ui-button / tumUiButton
  - ng-bootstrap: ngbTooltip
  - 1 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/iris/overview/iris-logo/iris-logo.component.html`
- `src/main/webapp/app/iris/overview/about-iris-modal/about-iris-modal.component.html` — 17 hits
  - `card-description`×3, `card-title-text`×2, `modal-content-wrapper`×1 → custom class: rename (banned by prefix only)
  - PrimeNG: pButton → tumUiButton
  - `src/main/webapp/app/iris/overview/about-iris-modal/about-iris-modal.component.scss`: 10 --bs-* variables, 1 raw colors
  - imports 1 unit with Bootstrap (1 hits): `app/iris/overview/iris-logo/iris-logo.component.html`
- `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-carousel.component.html` — 7 hits
  - `carousel-dots`×2, `carousel-header`×1, `carousel-navigation`×1, `carousel-counter`×1 → custom class: rename (banned by prefix only)
  - `src/main/webapp/app/iris/overview/mcq-question/iris-mcq-carousel.component.scss`: 2 --bs-* variables
  - imports 1 unit with Bootstrap (8 hits): `app/iris/overview/mcq-question/iris-mcq-question.component.html`
- `src/main/webapp/app/iris/overview/iris-onboarding-modal/iris-onboarding-modal.component.html` — 22 hits
  - `src/main/webapp/app/iris/overview/iris-onboarding-modal/iris-onboarding-modal.component.scss`: 18 --bs-* variables, 4 raw colors
  - imports 3 units with Bootstrap (8 hits): `app/iris/overview/iris-logo/iris-logo.component.html`, `app/iris/overview/iris-onboarding-modal/stepper/stepper.component.ts`, `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/iris/overview/base-chatbot/iris-base-chatbot.component.html` — 47 hits
  - `btn`×5, `btn-sm`×3, `btn-primary`×1, `btn-secondary`×1 → tum-ui-button / tumUiButton
  - `d-flex`×3 → flex
  - `align-items-center`×2 → items-center
  - `w-100`×1 → w-full
  - `justify-content-end`×1 → justify-end
  - `form-control`×1 → tumUiInput
  - PrimeNG: p-confirmdialog → tum-ui-confirm-dialog, p-menu → tum-ui-menu, pTooltip → tumUiTooltip
  - `src/main/webapp/app/iris/overview/base-chatbot/iris-base-chatbot.component.scss`: 22 --bs-* variables, 7 raw colors
  - 5 Bootstrap spacing classes to convert by size
  - imports 11 units with Bootstrap (65 hits): `app/course/shared/course-sidebar-toggle-button/course-sidebar-toggle-button.component.html`, `app/iris/overview/about-iris-modal/about-iris-modal.component.html`, `app/iris/overview/base-chatbot/chat-history-item/chat-history-item.component.html`, `app/iris/overview/base-chatbot/iris-activity-feed/iris-activity-feed.component.html`, `app/iris/overview/base-chatbot/memories-indicator/iris-chat-memories-indicator.component.html`, `app/iris/overview/context-selection/context-selection.component.html`, `app/iris/overview/context-selection/iris-context-switch-divider.component.html`, `app/iris/overview/iris-logo/iris-logo.component.html`, …

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
