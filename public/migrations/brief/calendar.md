# Artemis client migration brief: calendar

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
- `src/main/webapp/app/calendar/shared/calendar-events-per-day-section` (1 unit)
  ```
  'src/main/webapp/app/calendar/shared/calendar-events-per-day-section/**/*.html',
  "src/main/webapp/app/calendar/shared/calendar-events-per-day-section/**/*.scss",
  @source './app/calendar/shared/calendar-events-per-day-section';
  ```

## Shared units to fix first

- `src/main/webapp/app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.html` (jhi-calendar-mobile-day-presentation): imported by 1 Bootstrap-free unit; 1 hit: SCSS only
- `src/main/webapp/app/calendar/shared/calendar-subscription-popover/calendar-subscription-popover.component.html` (jhi-calendar-subscription-popover): imported by 1 Bootstrap-free unit; 1 hit: popover-content
- `src/main/webapp/app/calendar/mobile/overview/calendar-mobile-overview.component.html` (jhi-calendar-mobile-overview): imported by 1 Bootstrap-free unit; 2 hits: spinner-border, popover-content
- `src/main/webapp/app/calendar/desktop/overview/calendar-desktop-overview.component.html` (jhi-calendar-desktop-overview): imported by 1 Bootstrap-free unit; 4 hits: d-flex, align-items-center, spinner-border, visually-hidden

## calendar — 8 hits, 9 of 13 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.html` — 1 hit
  - `src/main/webapp/app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.scss`: 1 raw colors
- `src/main/webapp/app/calendar/shared/calendar-subscription-popover/calendar-subscription-popover.component.html` — 1 hit
  - `popover-content`×1 → custom class: rename (banned by prefix only)
  - PrimeNG: p-popover → tum-ui-popover, p-selectbutton → tum-ui-select-button, p-checkbox → tum-ui-checkbox
- `src/main/webapp/app/calendar/desktop/overview/calendar-desktop-overview.component.html` — 4 hits
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `visually-hidden`×1 → sr-only
  - PrimeNG: p-multiselect, p-selectbutton → tum-ui-select-button, pButton → tumUiButton, p-buttongroup → tum-ui-button-group
  - 3 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (1 hits): `app/calendar/shared/calendar-subscription-popover/calendar-subscription-popover.component.html`
- `src/main/webapp/app/calendar/mobile/overview/calendar-mobile-overview.component.html` — 2 hits
  - `spinner-border`×1 → tum-ui-progress-spinner
  - `popover-content`×1 → custom class: rename (banned by prefix only)
  - PrimeNG: pButton → tumUiButton, p-popover → tum-ui-popover, p-checkbox → tum-ui-checkbox
  - imports 2 units with Bootstrap (2 hits): `app/calendar/mobile/day-presentation/calendar-mobile-day-presentation.component.html`, `app/calendar/shared/calendar-subscription-popover/calendar-subscription-popover.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
