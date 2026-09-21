# Artemis client migration brief: notification

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

- `src/main/webapp/app/notification/course-notification/course-notification-bubble` (1 unit)
  ```
  'src/main/webapp/app/notification/course-notification/course-notification-bubble/**/*.html',
  "src/main/webapp/app/notification/course-notification/course-notification-bubble/**/*.scss",
  @source './app/notification/course-notification/course-notification-bubble';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/notification/course-notification/course-notification/course-notification.component.html` (jhi-course-notification): imported by 2 Bootstrap-free units; 6 hits: w-100
- `src/main/webapp/app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html` (jhi-course-notification-preset-picker): imported by 1 Bootstrap-free unit; 7 hits: d-flex, align-items-center

## notification — 30 hits, 2 of 6 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html` — 7 hits
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - PrimeNG: pButton → tumUiButton
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbDropdownItem
  - `src/main/webapp/app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.scss`: 4 --bs-* variables, 1 raw colors
- `src/main/webapp/app/notification/course-notification/course-notification/course-notification.component.html` — 6 hits
  - `w-100`×1 → w-full
  - `src/main/webapp/app/notification/course-notification/course-notification/course-notification.component.scss`: 4 --bs-* variables, 1 raw colors
  - imports 1 unit with Bootstrap (3 hits): `app/shared-ui/profile-picture/profile-picture.component.html`
- `src/main/webapp/app/notification/course-notification/course-notification-setting-specification-card/course-notification-setting-specification-card.component.html` — 9 hits
  - `form-check`×1, `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `form-switch`×1 → no guideline target
  - `d-flex`×1 → flex
  - `flex-column`×1 → flex-col
  - `align-items-center`×1 → items-center
  - `src/main/webapp/app/notification/course-notification/course-notification-setting-specification-card/course-notification-setting-specification-card.component.scss`: 3 --bs-* variables
  - 4 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (9 hits): `app/notification/course-notification/course-notification/course-notification.component.html`, `app/shared-ui/profile-picture/profile-picture.component.html`
- `src/main/webapp/app/notification/course-notification/course-notification-overview/course-notification-overview.component.html` — 8 hits
  - `text-secondary`×2 → --text-body-secondary
  - `d-inline-block`×1 → inline-block
  - PrimeNG: pButton → tumUiButton, pTooltip → tumUiTooltip
  - `src/main/webapp/app/notification/course-notification/course-notification-overview/course-notification-overview.component.scss`: 4 --bs-* variables, 1 raw colors
  - 5 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (16 hits): `app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html`, `app/notification/course-notification/course-notification/course-notification.component.html`, `app/shared-ui/profile-picture/profile-picture.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
