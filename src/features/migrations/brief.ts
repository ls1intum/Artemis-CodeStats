import {
  lockEntries,
  pullRequest,
  siteUrl,
  sourceUrl,
  unitPath,
  type Detail,
  type Summary,
  type Unit,
} from './model'
import { bootstrapTarget, kitTarget } from './targets'

const hits = (u: { classHits: number; styleHits: number }) =>
  u.classHits + u.styleHits
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const short = (path: string) => path.replace(/^src\/main\/webapp\//, '')
const file = (u: Unit) => u.template ?? unitPath(u.id)
const guideline =
  'https://github.com/ls1intum/Artemis/blob/develop/documentation/docs/developer/guidelines/client-development.mdx'

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
    path: file(u),
    url: sourceUrl(detail.commit, file(u)),
    status: u.status,
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

const taskLines = (task: UnitTask) => {
  const lines = [
    `- \`${short(task.path)}\` — ${plural(task.hits, 'hit')}${task.importedHits ? `, ${task.importedHits} in imported units` : ''}${task.status === 'locked' ? ' (locked path)' : ''}`,
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
      `  - \`${short(s.path)}\`: ${[
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
      `  - ${task.spacing} Bootstrap spacing classes to convert by size (\`mb-3\` is 1rem in Bootstrap, 0.75rem in Tailwind)`,
    )
  return lines
}

// One brief serves people and agents: markdown for reading, JSON for tooling.
export function renderBrief(
  snapshot: Summary,
  detail: Detail,
  options: { section?: string; limit?: number } = {},
) {
  const kit = new Set(detail.kit)
  const t = snapshot.totals
  const pr = pullRequest(snapshot.subject)
  const units = detail.units.filter(
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
        (!options.section || units.some((x) => x.blockers.includes(u.id))),
    )
    .sort((a, b) => b.blocks - a.blocks || hits(a) - hits(b))
    .slice(0, 10)
  const limit = options.limit ?? (options.section ? Infinity : 6)
  const shownLockable = options.section ? lockable : lockable.slice(0, 20)
  const bySection = sections.map((s) => ({
    name: s.name,
    hits: hits(s),
    units: s.units,
    bootstrapFree: s.locked + s.clean,
    tasks: units
      .filter((u) => u.section === s.name && hits(u) > 0)
      .sort((a, b) => hits(b) - hits(a))
      .slice(0, limit)
      .map((u) => unitTask(u, detail, kit)),
  }))
  const json = {
    generatedFrom: {
      commit: detail.commit,
      subject: snapshot.subject,
      date: snapshot.date,
      pullRequest: pr.url,
    },
    site: siteUrl,
    data: {
      history: `${siteUrl}migrations/index.json`,
      detail: `${siteUrl}migrations/${detail.commit}.json`,
      guideline,
    },
    scope: options.section ?? 'all sections',
    totals: t,
    lockable,
    blockers: blockers.map((u) => ({
      path: file(u),
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
    `> Bootstrap → Tailwind / TUM UI. Generated from Artemis \`${detail.commit.slice(0, 8)}\` (${snapshot.subject}${pr.url ? `, ${pr.url}` : ''}). Hits are class tokens matched by Artemis's own \`no-bootstrap-classes\` rule plus SCSS residue; a unit is done when its directory is in the lock list. Guideline: ${guideline}`,
    '',
    '## Status',
    '',
    `- ${t.classHits + t.styleHits} Bootstrap hits in ${t.dirty} of ${t.units} units; ${t.locked} units locked, ${t.clean} Bootstrap-free but unlocked`,
    `- ${t.pagesClean} of ${t.pages} routed pages import no Bootstrap`,
    `- ${t.lockableDirs} directories can be locked now (configuration-only change)`,
    '',
    '## How to migrate a unit',
    '',
    '1. Convert the whole rendering closure, never half: replace Bootstrap classes with the targets below, PrimeNG with the TUM UI kit component where one exists, and raw colors with semantic tokens (`text-state-*`, `--text-body-secondary`).',
    '2. Convert spacing by size, not by name. Delete component SCSS that only restyled Bootstrap.',
    '3. When a directory has zero hits and imports nothing with hits, add it to the three lock lists (`eslint.config.mjs`, `.stylelintrc.json`, `tailwind.css`) and run `pnpm run test:rules && pnpm run lint && pnpm run stylelint`.',
    '',
  ]
  if (lockable.length) {
    md.push('## Lock now', '')
    for (const l of shownLockable) {
      md.push(`- \`${short(l.dir)}\` (${plural(l.units, 'unit')})`)
      md.push(
        '  ```',
        `  ${l.entries.eslint}`,
        `  ${l.entries.stylelint}`,
        `  ${l.entries.tailwind}`,
        '  ```',
      )
    }
    if (lockable.length > shownLockable.length)
      md.push(
        `- … ${lockable.length - shownLockable.length} more directories in the JSON brief`,
      )
    md.push('')
  }
  if (blockers.length) {
    md.push('## Shared units to fix first', '')
    for (const u of blockers)
      md.push(
        `- \`${short(file(u))}\`${u.selector ? ` (${u.selector})` : ''}: imported by ${plural(u.blocks, 'Bootstrap-free unit')}; ${plural(hits(u), 'hit')}: ${Object.keys(u.tokens).join(', ') || 'SCSS only'}`,
      )
    md.push('')
  }
  for (const s of bySection) {
    if (!s.tasks.length) continue
    md.push(
      `## ${s.name} — ${s.hits} hits, ${s.bootstrapFree} of ${s.units} units Bootstrap-free`,
      '',
    )
    for (const task of s.tasks) md.push(...taskLines(task))
    if (!options.section) {
      const remaining =
        units.filter((u) => u.section === s.name && hits(u) > 0).length -
        s.tasks.length
      if (remaining > 0)
        md.push(`- … ${remaining} more units in the detail JSON`)
    }
    md.push('')
  }
  md.push(
    '## Data',
    '',
    `- History (every commit): ${json.data.history}`,
    `- This snapshot (units, blockers, inventories): ${json.data.detail}`,
    `- Schema: https://github.com/ls1intum/Artemis-CodeStats/blob/main/src/features/migrations/model.ts`,
    '',
  )
  return { markdown: md.join('\n'), json }
}
