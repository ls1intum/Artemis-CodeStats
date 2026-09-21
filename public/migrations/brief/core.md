# Artemis client migration brief: core

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

- `src/main/webapp/app/core/feature-overview` (1 unit)
  ```
  'src/main/webapp/app/core/feature-overview/**/*.html',
  "src/main/webapp/app/core/feature-overview/**/*.scss",
  @source './app/core/feature-overview';
  ```
- `src/main/webapp/app/core/legal/data-export/type-ahead-search-field` (1 unit)
  ```
  'src/main/webapp/app/core/legal/data-export/type-ahead-search-field/**/*.html',
  "src/main/webapp/app/core/legal/data-export/type-ahead-search-field/**/*.scss",
  @source './app/core/legal/data-export/type-ahead-search-field';
  ```
- `src/main/webapp/app/core/navbar/variant-generation-tray` (1 unit)
  ```
  'src/main/webapp/app/core/navbar/variant-generation-tray/**/*.html',
  "src/main/webapp/app/core/navbar/variant-generation-tray/**/*.scss",
  @source './app/core/navbar/variant-generation-tray';
  ```
- `src/main/webapp/app/core/notification` (1 unit)
  ```
  'src/main/webapp/app/core/notification/**/*.html',
  "src/main/webapp/app/core/notification/**/*.scss",
  @source './app/core/notification';
  ```

## Shared units to fix first

- `src/main/webapp/app/shared-ui/components/buttons/button/button.component.html` (jhi-button): imported by 44 Bootstrap-free units; 5 hits: w-100, btn, d-none, d-md-inline, d-xl-inline
- `src/main/webapp/app/shared-ui/profile-picture/profile-picture.component.html` (jhi-profile-picture): imported by 15 Bootstrap-free units; 3 hits: SCSS only
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/notification/course-notification/course-notification/course-notification.component.html` (jhi-course-notification): imported by 2 Bootstrap-free units; 6 hits: w-100
- `src/main/webapp/app/iris/overview/base-chatbot/iris-thinking-bubble/iris-thinking-bubble.component.html` (jhi-iris-thinking-bubble): imported by 1 Bootstrap-free unit; 3 hits: SCSS only
- `src/main/webapp/app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html` (jhi-course-notification-preset-picker): imported by 1 Bootstrap-free unit; 7 hits: d-flex, align-items-center
- `src/main/webapp/app/core/navbar/global-search/components/views/navigation-view/global-search-navigation-view.component.html` (jhi-global-search-navigation-view): imported by 1 Bootstrap-free unit; 11 hits: text-danger, text-secondary, text-body-tertiary, d-flex, align-items-start, flex-shrink-0, flex-column, flex-grow-1, align-items-center
- `src/main/webapp/app/core/navbar/global-search/components/modal/filter-menu/global-search-filter-menu.component.html` (jhi-global-search-filter-menu): imported by 1 Bootstrap-free unit; 16 hits: SCSS only
- `src/main/webapp/app/core/navbar/global-search/components/modal/search-input/search-input.component.html` (jhi-global-search-input): imported by 1 Bootstrap-free unit; 18 hits: SCSS only
- `src/main/webapp/app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.html` (jhi-global-search-result-item): imported by 1 Bootstrap-free unit; 36 hits: d-flex, align-items-start, flex-shrink-0, flex-grow-1, align-items-center, text-truncate, badge, d-inline-flex, text-secondary

## core — 311 hits, 15 of 41 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/core/landing/landing-community.component.ts` — 1 hit
  - `visually-hidden`×1 → sr-only
- `src/main/webapp/app/core/landing/landing-research.component.ts` — 1 hit
  - `visually-hidden`×1 → sr-only
- `src/main/webapp/app/core/landing/landing-social-proof.component.ts` — 1 hit
  - `visually-hidden`×1 → sr-only
- `src/main/webapp/app/core/landing/landing-trust.component.ts` — 1 hit
  - `visually-hidden`×1 → sr-only
- `src/main/webapp/app/core/loading-notification/loading-notification.component.ts` — 1 hit
  - `spinner-border`×1 → tum-ui-progress-spinner
- `src/main/webapp/app/core/landing/landing-hero.component.ts` — 3 hits
  - `visually-hidden`×3 → sr-only
- `src/main/webapp/app/core/home/saml2-login/saml2-login.component.html` — 4 hits
  - `btn`×1, `btn-primary`×1, `btn-lg`×1 → tum-ui-button / tumUiButton
  - `w-100`×1 → w-full
- `src/main/webapp/app/core/theme/theme-switch.component.html` — 4 hits
  - `popover-content`×1 → custom class: rename (banned by prefix only)
  - `form-switch`×1 → no guideline target
  - `form-check-input`×1 → tum-ui-checkbox / tum-ui-radio-button
  - ng-bootstrap: ngbPopover
  - `src/main/webapp/app/core/theme/theme-switch.component.scss`: 1 --bs-* variables
- `src/main/webapp/app/core/navbar/global-search/components/global-search-navbar.component.html` — 5 hits
  - `src/main/webapp/app/core/navbar/global-search/components/global-search-navbar.component.scss`: 4 --bs-* variables, 1 raw colors
- `src/main/webapp/app/core/layouts/profiles/page-ribbon.component.ts` — 6 hits
  - `src/main/webapp/app/core/layouts/profiles/page-ribbon.scss`: 6 raw colors (shared by 2 units)
- `src/main/webapp/app/core/about-us/about-us.component.html` — 8 hits · route `/about`
  - `row`×3 → grid grid-cols-12 (or flex)
  - `card-title`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - `col-md-4`×1 → md:col-span-4
  - `w-100`×1 → w-full
  - `col-md-8`×1 → md:col-span-8
  - 26 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/core/landing/landing-features.component.ts` — 8 hits
  - `card-text`×1 → tum-ui-card / tum-ui-panel
  - `card-category`×1, `card-description`×1, `card-assets`×1, `card-image`×1, `card-downloads`×1, `card-download`×1, `card-download-badge`×1 → custom class: rename (banned by prefix only)
- `src/main/webapp/app/core/layouts/error/error.component.html` — 8 hits
  - `alert`×3, `alert-danger`×3 → tum-ui-message
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col`×1 → flex-1
- `src/main/webapp/app/core/legal/data-export/confirmation/data-export-confirmation-dialog.component.html` — 8 hits
  - `btn`×2, `btn-secondary`×1, `btn-primary`×1 → tum-ui-button / tumUiButton
  - `form-check`×1, `form-check-input`×1, `form-check-label`×1 → tum-ui-checkbox / tum-ui-radio-button
  - `d-none`×1 → hidden
  - PrimeNG: p-dialog → tum-ui-dialog
- `src/main/webapp/app/core/navbar/global-search/components/modal/filter-menu/global-search-filter-menu.component.html` — 16 hits
  - `src/main/webapp/app/core/navbar/global-search/components/modal/filter-menu/global-search-filter-menu.component.scss`: 16 --bs-* variables
- `src/main/webapp/app/core/navbar/global-search/components/modal/search-input/search-input.component.html` — 18 hits
  - `src/main/webapp/app/core/navbar/global-search/components/modal/search-input/search-input.component.scss`: 18 --bs-* variables
  - 4 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.html` — 36 hits
  - `align-items-center`×9 → items-center
  - `d-flex`×8 → flex
  - `text-secondary`×3 → --text-body-secondary
  - `badge`×2 → tum-ui-tag
  - `d-inline-flex`×2 → inline-flex
  - `align-items-start`×1 → items-start
  - `flex-shrink-0`×1 → shrink-0
  - `flex-grow-1`×1 → grow
  - `text-truncate`×1 → truncate
  - `src/main/webapp/app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.scss`: 7 --bs-* variables, 1 raw colors
  - 19 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/core/landing/landing-navbar.component.ts` — 2 hits
  - `nav-link`×2 → tum-ui-tabs
  - PrimeNG: p-menu → tum-ui-menu
  - imports 1 unit with Bootstrap (4 hits): `app/core/theme/theme-switch.component.html`
- `src/main/webapp/app/core/navbar/global-search/components/views/iris-answer/global-search-iris-answer.component.html` — 40 hits
  - `align-items-center`×5 → items-center
  - `d-inline-flex`×3 → inline-flex
  - `d-flex`×2 → flex
  - `flex-shrink-0`×2 → shrink-0
  - `text-truncate`×1 → truncate
  - `text-body-secondary`×1 → --text-body-secondary
  - `justify-content-center`×1 → justify-center
  - `src/main/webapp/app/core/navbar/global-search/components/views/iris-answer/global-search-iris-answer.component.scss`: 25 --bs-* variables
  - 2 Bootstrap spacing classes to convert by size
  - imports 2 units with Bootstrap (4 hits): `app/iris/overview/base-chatbot/iris-thinking-bubble/iris-thinking-bubble.component.html`, `app/iris/overview/iris-logo/iris-logo.component.html`
- `src/main/webapp/app/core/home/home.component.html` — 53 hits · route `/sign-in`
  - `w-100`×13 → w-full
  - `d-flex`×9 → flex
  - `flex-column`×5 → flex-col
  - `form-group`×5 → tum-ui-form-field
  - `align-items-center`×3 → items-center
  - `justify-content-center`×2 → justify-center
  - `row`×2 → grid grid-cols-12 (or flex)
  - `flex-grow-1`×2 → grow
  - `form-check`×2, `form-check-label`×2 → tum-ui-checkbox / tum-ui-radio-button
  - `col-md-8`×1 → md:col-span-8
  - `col-12`×1 → col-span-12
  - `col-xl-5`×1 → xl:col-span-5
  - `h-100`×1 → h-full
  - `text-danger`×1 → text-state-danger
  - `btn-toolbar`×1 → tum-ui-button / tumUiButton
  - `d-block`×1 → block
  - `text-muted`×1 → --text-body-secondary
  - 35 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (4 hits): `app/core/home/saml2-login/saml2-login.component.html`
- `src/main/webapp/app/core/auth/passkey-authentication-page/passkey-authentication-page.component.html` — 13 hits · route `/passkey-required`
  - `justify-content-center`×2 → justify-center
  - `alert`×2, `alert-info`×1, `alert-warning`×1 → tum-ui-message
  - `d-flex`×1 → flex
  - `align-items-center`×1 → items-center
  - `row`×1 → grid grid-cols-12 (or flex)
  - `col-md-10`×1 → md:col-span-10
  - `col-lg-8`×1 → lg:col-span-8
  - `card`×1, `card-body`×1 → tum-ui-card / tum-ui-panel
  - 5 Bootstrap spacing classes to convert by size
  - imports 1 unit with Bootstrap (5 hits): `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/core/legal/data-export/confirmation/data-export-request-button.component.ts` — 4 hits
  - `btn`×1, `btn-primary`×1, `btn-lg`×1 → tum-ui-button / tumUiButton
  - `d-xl-inline`×1 → xl:inline
  - imports 1 unit with Bootstrap (8 hits): `app/core/legal/data-export/confirmation/data-export-confirmation-dialog.component.html`
- `src/main/webapp/app/core/legal/data-export/data-export.component.html` — 4 hits · route `/privacy/data-exports`
  - `align-content-center`×2 → content-center
  - `d-flex`×1 → flex
  - `justify-content-center`×1 → justify-center
  - 2 Bootstrap spacing classes to convert by size
  - imports 3 units with Bootstrap (17 hits): `app/core/legal/data-export/confirmation/data-export-confirmation-dialog.component.html`, `app/core/legal/data-export/confirmation/data-export-request-button.component.ts`, `app/shared-ui/components/buttons/button/button.component.html`
- `src/main/webapp/app/core/landing/landing.component.html` — 1 hit · route `/`
  - `visually-hidden-focusable`×1 → sr-only
  - imports 8 units with Bootstrap (21 hits): `app/core/landing/landing-community.component.ts`, `app/core/landing/landing-features.component.ts`, `app/core/landing/landing-hero.component.ts`, `app/core/landing/landing-navbar.component.ts`, `app/core/landing/landing-research.component.ts`, `app/core/landing/landing-social-proof.component.ts`, `app/core/landing/landing-trust.component.ts`, `app/core/theme/theme-switch.component.html`
- `src/main/webapp/app/core/navbar/navbar.component.html` — 53 hits
  - `dropdown-item`×7, `dropdown`×2, `dropdown-toggle`×2, `dropdown-menu`×2, `dropdown-divider`×2, `dropdown-header`×1 → tum-ui-menu
  - `d-flex`×4 → flex
  - `align-items-center`×4 → items-center
  - `nav-link`×2 → tum-ui-tabs
  - `align-self-center`×2 → self-center
  - `justify-content-center`×2 → justify-center
  - `breadcrumb-link`×2, `dropdown-menu-index`×1, `navbar-title`×1, `navbar-version`×1, `navbar-course-link`×1, `navbar-course-title`×1, `navbar-course-image`×1, `breadcrumb-container`×1, `breadcrumb-divider`×1 → custom class: rename (banned by prefix only)
  - `navbar`×1, `navbar-brand`×1, `navbar-collapse`×1 → application shell (no kit component)
  - `collapse`×1 → tum-ui-panel
  - `breadcrumb`×1, `breadcrumb-item`×1 → plain markup with Tailwind
  - ng-bootstrap: ngbDropdown, ngbDropdownToggle, ngbDropdownMenu, ngbTooltip, ngbCollapse
  - `src/main/webapp/app/core/navbar/navbar.scss`: 7 --bs-* variables
  - 3 Bootstrap spacing classes to convert by size
  - imports 7 units with Bootstrap (34 hits): `app/core/loading-notification/loading-notification.component.ts`, `app/core/navbar/global-search/components/global-search-navbar.component.html`, `app/core/theme/theme-switch.component.html`, `app/notification/course-notification/course-notification-overview/course-notification-overview.component.html`, `app/notification/course-notification/course-notification-preset-picker/course-notification-preset-picker.component.html`, `app/notification/course-notification/course-notification/course-notification.component.html`, `app/shared-ui/profile-picture/profile-picture.component.html`
- `src/main/webapp/app/core/navbar/global-search/components/views/navigation-view/global-search-navigation-view.component.html` — 11 hits
  - `d-flex`×3 → flex
  - `text-danger`×1 → text-state-danger
  - `text-secondary`×1, `text-body-tertiary`×1 → --text-body-secondary
  - `align-items-start`×1 → items-start
  - `flex-shrink-0`×1 → shrink-0
  - `flex-column`×1 → flex-col
  - `flex-grow-1`×1 → grow
  - `align-items-center`×1 → items-center
  - PrimeNG: p-skeleton
  - 9 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (80 hits): `app/core/navbar/global-search/components/modal/search-result-item/search-result-item.component.html`, `app/core/navbar/global-search/components/views/iris-answer/global-search-iris-answer.component.html`, `app/iris/overview/base-chatbot/iris-thinking-bubble/iris-thinking-bubble.component.html`, `app/iris/overview/iris-logo/iris-logo.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
