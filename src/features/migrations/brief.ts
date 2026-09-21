import {
  appRoot,
  lockEntries,
  pullRequest,
  siteUrl,
  sourceUrl,
  type Detail,
  type Summary,
  type Unit,
} from './model'
import { hits, short, unitFile } from './format'
import { bootstrapTarget, kitTarget } from './targets'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
export const guidelineUrl =
  'https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/guidelines/client-development.mdx'
const kitReferenceUrl =
  'https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/tum-ui.mdx'
const briefUrl = (section?: string) =>
  `${siteUrl}migrations/brief${section ? `/${section}` : ''}`

function unitTask(u: Unit, detail: Detail, kit: Set<string>) {
  const tokens = Object.entries(u.tokens).sort((a, b) => b[1] - a[1])
  const targets = new Map<string, string[]>()
  for (const [token] of tokens) {
    const target = bootstrapTarget(token) || 'no guideline target'
    targets.set(target, [...(targets.get(target) ?? []), token])
  }
  const primeng = Object.keys(u.primeng)
    .filter((n) => /^p(?:-|[A-Z])/.test(n))
    .map((n) => `${n}${kitTarget(n, kit) ? ` → ${kitTarget(n, kit)}` : ''}`)
  const styles = detail.styles.filter((s) => u.styles.includes(s.path))
  return {
    path: unitFile(u),
    url: sourceUrl(detail.commit, unitFile(u)),
    status: u.status,
    route: u.route,
    hits: hits(u),
    importedHits: u.closureHits,
    tokens: Object.fromEntries(tokens),
    targets: [...targets].map(([target, classes]) => ({ target, classes })),
    primeng,
    ngBootstrap: Object.keys(u.ngBootstrap),
    styles: styles.map((s) => ({
      path: s.path,
      variables: s.variables,
      colors: s.colors,
      imports: s.imports,
      sharedBy: s.units,
    })),
    spacing: u.spacing,
    blockers: u.blockers,
  }
}
export type UnitTask = ReturnType<typeof unitTask>

const taskLines = (task: UnitTask, byId: Map<string, Unit>) => {
  const lines = [
    `- \`${task.path}\` — ${plural(task.hits, 'hit')}${task.status === 'locked' ? ' (locked path)' : ''}${task.route ? ` · route \`${task.route}\`` : ''}`,
  ]
  for (const { target, classes } of task.targets)
    lines.push(
      `  - ${classes.map((c) => `\`${c}\`×${task.tokens[c]}`).join(', ')} → ${target}`,
    )
  if (task.primeng.length) lines.push(`  - PrimeNG: ${task.primeng.join(', ')}`)
  if (task.ngBootstrap.length)
    lines.push(`  - ng-bootstrap: ${task.ngBootstrap.join(', ')}`)
  for (const s of task.styles)
    lines.push(
      `  - \`${s.path}\`: ${[
        s.variables && `${s.variables} --bs-* variables`,
        s.colors && `${s.colors} raw colors`,
        s.imports && `${s.imports} Bootstrap Sass imports`,
      ]
        .filter(Boolean)
        .join(
          ', ',
        )}${s.sharedBy > 1 ? ` (shared by ${s.sharedBy} units)` : ''}`,
    )
  if (task.spacing)
    lines.push(
      `  - ${task.spacing} Bootstrap spacing classes to convert by size`,
    )
  if (task.blockers.length)
    lines.push(
      `  - imports ${plural(task.blockers.length, 'unit')} with Bootstrap (${task.importedHits} hits): ${task.blockers
        .slice(0, 8)
        .map((id) => `\`${short(unitFile(byId.get(id)!))}\``)
        .join(', ')}${task.blockers.length > 8 ? ', …' : ''}`,
    )
  return lines
}

const runbook = [
  '## How to migrate',
  '',
  '1. Convert the whole rendering closure of a unit, never half: a migrated element under a Bootstrap ancestor loses the cascade. Leave app-wide shared units (navbar, footer, delete dialog) as they are until they are migrated as their own locked units; do not put a Tailwind utility on their host.',
  `2. Replace each Bootstrap class with the target listed for it; use the TUM UI kit component where one exists (reference: ${kitReferenceUrl}). Import kit symbols from \`@tumaet/ui-angular\`.`,
  '3. Convert spacing by size, not by name: Bootstrap `mb-3` is 1rem, Tailwind `mb-4` is 1rem. Replace raw colors and `--bs-*` variables in SCSS with semantic tokens (`text-state-*`, `--text-body-secondary`); delete SCSS that only restyled Bootstrap.',
  '4. Verify locally with `pnpm migrate:check <path under src/main/webapp/app>` (prints remaining hits, exit 0 when ready to lock) and `pnpm migrate:status`.',
  '5. When a directory is ready, add its three entries: the `.html` glob to the `files` array of the block that enables `localRules/no-bootstrap-classes` in `eslint.config.mjs`, the `.scss` glob to the `--bs-`/hex override in `.stylelintrc.json`, and the `@source` line (relative to `src/main/webapp/tailwind.css`) to `tailwind.css`. Then run `pnpm run test:rules && pnpm run lint && pnpm run stylelint && pnpm run prettier:check`, restart the dev server and check light and dark mode.',
  '',
  'Work order: shared units with few hits and many dependants first, then units that import nothing with hits (they can be locked right after), then the rest.',
  '',
]

// One brief serves people and agents: markdown for reading, JSON for tooling.
export function renderBrief(
  snapshot: Summary,
  detail: Detail,
  options: { section?: string; limit?: number } = {},
) {
  const kit = new Set(detail.kit)
  const byId = new Map(detail.units.map((u) => [u.id, u]))
  const t = snapshot.totals
  const pr = pullRequest(snapshot.subject)
  const scoped = detail.units.filter(
    (u) => !options.section || u.section === options.section,
  )
  const sections = detail.sections.filter(
    (s) => (!options.section || s.name === options.section) && s.units > 0,
  )
  const lockable = detail.lockable
    .filter(
      (l) => !options.section || l.dir.includes(`/app/${options.section}/`),
    )
    .sort((a, b) => b.units - a.units || a.dir.localeCompare(b.dir))
    .map((l) => ({ ...l, entries: lockEntries(l.dir) }))
  const blockers = detail.units
    .filter(
      (u) =>
        u.blocks > 0 &&
        (!options.section || scoped.some((x) => x.blockers.includes(u.id))),
    )
    .sort((a, b) => b.blocks - a.blocks || hits(a) - hits(b))
    .slice(0, 10)
  const limit = options.limit ?? (options.section ? Infinity : 0)
  const bySection = sections.map((s) => {
    const dirty = scoped.filter((u) => u.section === s.name && hits(u) > 0)
    return {
      name: s.name,
      hits: hits(s),
      units: s.units,
      bootstrapFree: s.locked + s.clean,
      dirtyUnits: dirty.length,
      brief: `${briefUrl(s.name)}.json`,
      tasks: dirty
        .sort(
          (a, b) =>
            a.closureHits - b.closureHits ||
            hits(a) - hits(b) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, limit)
        .map((u) => unitTask(u, detail, kit)),
    }
  })
  const shell = detail.units.find((u) => u.id === `${appRoot}/app.component.ts`)
  const json = {
    generatedFrom: {
      commit: detail.commit,
      subject: snapshot.subject,
      date: snapshot.date,
      pullRequest: pr.url,
    },
    scope: options.section ?? 'all sections',
    links: {
      site: siteUrl,
      history: `${siteUrl}migrations/index.json`,
      detail: `${siteUrl}migrations/${detail.commit}.json`,
      guideline: guidelineUrl,
      kitReference: kitReferenceUrl,
    },
    totals: t,
    shell: shell && {
      path: unitFile(shell),
      hits: hits(shell) + shell.closureHits,
      blockers: shell.blockers,
    },
    lockable,
    blockers: blockers.map((u) => ({
      path: unitFile(u),
      selector: u.selector,
      blocks: u.blocks,
      hits: hits(u),
      tokens: u.tokens,
    })),
    sections: bySection,
  }
  const md: string[] = [
    `# Artemis client migration brief${options.section ? `: ${options.section}` : ''}`,
    '',
    `> Bootstrap → Tailwind / TUM UI. Generated from Artemis \`${detail.commit.slice(0, 8)}\` (${snapshot.subject}${pr.url ? `, ${pr.url}` : ''}). Paths are relative to the Artemis repository. Hits are class tokens matched by Artemis's own \`no-bootstrap-classes\` rule plus SCSS residue; a unit is done when its directory is in the lock list. Guideline: ${guidelineUrl}`,
    '',
    '## Status',
    '',
    `- ${t.classHits + t.styleHits} Bootstrap hits in ${t.dirty} of ${t.units} units; ${t.locked} units locked, ${t.clean} Bootstrap-free but unlocked`,
    `- ${t.pagesClean} of ${t.pages} routed pages import no Bootstrap, not counting the global shell`,
    `- ${t.lockableDirs} directories can be locked now (configuration-only change)`,
    '',
    ...runbook,
  ]
  if (lockable.length) {
    const shown = options.section ? lockable : lockable.slice(0, 20)
    md.push('## Lock now', '')
    for (const l of shown)
      md.push(
        `- \`${l.dir}\` (${plural(l.units, 'unit')})`,
        '  ```',
        `  ${l.entries.eslint}`,
        `  ${l.entries.stylelint}`,
        `  ${l.entries.tailwind}`,
        '  ```',
      )
    if (lockable.length > shown.length)
      md.push(
        `- … ${lockable.length - shown.length} more directories in the JSON brief`,
      )
    md.push('')
  }
  if (blockers.length) {
    md.push('## Shared units to fix first', '')
    for (const u of blockers)
      md.push(
        `- \`${unitFile(u)}\`${u.selector ? ` (${u.selector})` : ''}: imported by ${plural(u.blocks, 'Bootstrap-free unit')}; ${plural(hits(u), 'hit')}: ${Object.keys(u.tokens).join(', ') || 'SCSS only'}`,
      )
    md.push('')
  }
  if (!options.section) {
    if (json.shell && json.shell.hits > 0)
      md.push(
        '## Global shell',
        '',
        `- \`${json.shell.path}\` and what it imports (navbar, footer, overlays) carry ${json.shell.hits} hits and render on every page. Pages count as ready without it; the shell is its own migration.`,
        '',
      )
    md.push('## Sections', '')
    for (const s of bySection)
      md.push(
        `- ${s.name}: ${plural(s.hits, 'hit')} in ${plural(s.dirtyUnits, 'unit')}, ${s.bootstrapFree} of ${s.units} Bootstrap-free — brief: ${briefUrl(s.name)}.md`,
      )
    md.push('')
  }
  for (const s of bySection) {
    if (!s.tasks.length) continue
    md.push(
      `## ${s.name} — ${s.hits} hits, ${s.bootstrapFree} of ${s.units} units Bootstrap-free`,
      '',
      'Units in work order (fewest imported hits first):',
      '',
    )
    for (const task of s.tasks) md.push(...taskLines(task, byId))
    md.push('')
  }
  md.push(
    '## Data',
    '',
    `- History (every commit): ${json.links.history}`,
    `- This snapshot (units, pages, blockers, inventories): ${json.links.detail}`,
    '- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts',
    '',
  )
  return { markdown: md.join('\n'), json }
}

export function renderLlmsTxt(detail: Detail) {
  const sections = detail.sections
    .filter((s) => s.units > 0 && s.dirty > 0)
    .map((s) => s.name)
  return [
    '# Artemis CodeStats',
    '',
    "> Migration reports for the Artemis learning platform's Angular client: remaining Bootstrap, ng-bootstrap and PrimeNG usage on the way to Tailwind and the TUM UI kit, measured with Artemis's own lint rule and lock list for every commit on `develop`.",
    '',
    '## Migration brief',
    '',
    `- [Brief (markdown)](${briefUrl()}.md): status, directories to lock with the exact entries, shared units to fix first, the migration runbook and a section index.`,
    `- [Brief (JSON)](${briefUrl()}.json): the same as structured data.`,
    '',
    '## Section briefs',
    '',
    ...sections.map(
      (s) =>
        `- [${s}](${briefUrl(s)}.md): every unit with Bootstrap in \`src/main/webapp/app/${s}\`, in work order, with class-to-target mappings ([JSON](${briefUrl(s)}.json)).`,
    ),
    '',
    '## Data',
    '',
    `- [History](${siteUrl}migrations/index.json): totals and per-section rows for every first-parent commit since the TUM UI package adoption, with commit subjects.`,
    `- [Latest detail](${siteUrl}migrations/${detail.commit}.json): units, routed pages, blockers, stylesheets and inventories at the latest checkpoint.`,
    '- [Schema and definitions](https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts): zod schemas for the history manifest and the detail files.',
    '- [Methodology](https://github.com/ls1intum/Artemis-CodeStats/blob/main/docs/migration-dashboard.md): what a hit, a unit, locked, lockable, imported hits and a ready page mean.',
    '',
    '## How to migrate',
    '',
    `- [Artemis client guideline, section Styling](${guidelineUrl}): the Bootstrap → TUM UI/Tailwind quick reference and the lock runbook.`,
    `- [TUM UI component reference](${kitReferenceUrl})`,
    '',
  ].join('\n')
}
