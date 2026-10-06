import { row, sectionOf, webapp, type Summary } from './model'
import type { DetailView } from './load-report'
import { hits } from './format'

// A module is the first directory below src/main/webapp/app (course, exam, …); `app` holds the
// root files and `content` the global styles. Scoping restricts every view to one module.

const empty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const
// Stored paths are relative to src/main/webapp/; lock globs and directories are not.
const inModule = (path: string, module: string) =>
  sectionOf(path.startsWith(webapp) ? path : webapp + path) === module

// Totals of one module from the compact per-module row; residue and pages need the detail.
export function scopeSummary(s: Summary, module: string): Summary {
  const r = s.sections[module] ?? empty
  const flow = s.flow?.sections[module]
  return {
    ...s,
    totals: {
      ...s.totals,
      units: r[row.units],
      locked: r[row.locked],
      clean: r[row.clean],
      dirty: r[row.dirty],
      classHits: r[row.classHits],
      styleHits: r[row.styleHits],
      legacyFree: r[row.legacyFree],
      primeng: r[row.primeng],
      ngBootstrap: r[row.ngBootstrap],
      tumUi: r[row.tumUi],
      lockedDirs: r[row.lockEntries],
      bootstrapUnits: r[row.bootstrapUnits],
      lockedResidue: 0,
      lockableDirs: 0,
      pages: 0,
      pagesClean: 0,
    },
    flow: s.flow && {
      hitsRemoved: flow?.[0] ?? 0,
      hitsAdded: flow?.[1] ?? 0,
      converted: flow?.[2] ?? 0,
      regressed: flow?.[3] ?? 0,
      locked: flow?.[4] ?? 0,
      sections: flow ? { [module]: flow } : {},
    },
    sections: s.sections[module] ? { [module]: s.sections[module] } : {},
  }
}

export function scopeDetail(d: DetailView, module: string): DetailView {
  return {
    ...d,
    lockGlobs: d.lockGlobs.filter((g) => inModule(g, module)),
    lockable: d.lockable.filter((l) => inModule(`${l.dir}/x`, module)),
    sections: d.sections.filter((s) => s.name === module),
    units: d.units.filter((u) => u.section === module),
    styles: d.styles.filter((f) => f.section === module),
    files: d.files.filter((f) => f.section === module),
    diagnostics: d.diagnostics.filter((x) => inModule(x.path, module)),
  }
}

// The snapshot's totals for a module, completed from its scoped detail.
export function scopeSnapshot(
  s: Summary,
  module: string,
  detail: DetailView,
): Summary {
  const scoped = scopeSummary(s, module)
  const pages = detail.units.filter((u) => u.route !== undefined)
  return {
    ...scoped,
    totals: {
      ...scoped.totals,
      lockedResidue: detail.units
        .filter((u) => u.status === 'locked')
        .reduce((n, u) => n + hits(u), 0),
      lockableDirs: detail.lockable.length,
      pages: pages.length,
      pagesClean: pages.filter(
        (u) => hits(u) + u.closureHits + u.routeHits === 0,
      ).length,
    },
  }
}
