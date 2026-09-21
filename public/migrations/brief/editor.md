# Artemis client migration brief: editor

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

- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` (jhi-monaco-editor): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/iris/overview/iris-logo/iris-logo.component.html` (jhi-iris-logo): imported by 14 Bootstrap-free units; 1 hit: SCSS only
- `src/main/webapp/app/communication/posting-button/posting-button.component.html` (button[jhi-posting-button]): imported by 10 Bootstrap-free units; 3 hits: btn, btn-outline-primary, btn-sm
- `src/main/webapp/app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html` (jhi-redirect-to-iris-button): imported by 10 Bootstrap-free units; 3 hits: btn, btn-sm, btn-outline-secondary

## editor — 22 hits, 1 of 4 units Bootstrap-free

Units in work order (fewest imported hits first):

- `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.ts` — 1 hit
  - `src/main/webapp/app/editor/monaco-editor/monaco-editor.component.scss`: 1 raw colors
- `src/main/webapp/app/editor/monaco-editor/inline-refinement-button/inline-refinement-button.component.html` — 17 hits
  - `d-flex`×5 → flex
  - `align-items-center`×5 → items-center
  - `flex-shrink-0`×2 → shrink-0
  - `justify-content-center`×2 → justify-center
  - `w-100`×1 → w-full
  - `text-danger`×1 → text-state-danger
  - `text-muted`×1 → --text-body-secondary
  - PrimeNG: pButton → tumUiButton
  - 8 Bootstrap spacing classes to convert by size
- `src/main/webapp/app/editor/markdown-editor/monaco/markdown-editor-monaco.component.html` — 4 hits
  - `btn`×1, `btn-sm`×1, `btn-outline-secondary`×1 → tum-ui-button / tumUiButton
  - PrimeNG: p-tabs → tum-ui-tabs, p-tablist, p-tab → tum-ui-tab, pButton → tumUiButton, pTooltip → tumUiTooltip, p-popover → tum-ui-popover, p-tieredmenu, p-tag → tum-ui-tag
  - `src/main/webapp/app/editor/markdown-editor/monaco/markdown-editor-monaco.component.scss`: 1 --bs-* variables
  - 21 Bootstrap spacing classes to convert by size
  - imports 4 units with Bootstrap (8 hits): `app/communication/posting-button/posting-button.component.html`, `app/communication/shared/redirect-to-iris-button/redirect-to-iris-button.component.html`, `app/editor/monaco-editor/monaco-editor.component.ts`, `app/iris/overview/iris-logo/iris-logo.component.html`

## Data

- History (every commit): https://ls1intum.github.io/Artemis-CodeStats/migrations/index.json
- This snapshot (units, pages, blockers, inventories): https://ls1intum.github.io/Artemis-CodeStats/migrations/5be30e1d757c739f95291431c048007811ee4b88.json
- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts
