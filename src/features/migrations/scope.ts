import type { Summary } from './model'
import type { DetailView } from './load-report'
import { hits } from './format'

// A module is the first directory below src/main/webapp/app (course, exam, …); `app` holds the
// root files and `content` the global styles. Scoping restricts every view to one module.

const empty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const

// Totals of one module from the compact per-module row; lock and page counts need the detail.
export function scopeSummary(s: Summary, module: string): Summary {
  const [
    units,
    locked,
    clean,
    dirty,
    classHits,
    styleHits,
    legacyFree,
    primeng,
    ngBootstrap,
    tumUi,
  ] = s.sections[module] ?? empty
  return {
    ...s,
    totals: {
      ...s.totals,
      units,
      locked,
      clean,
      dirty,
      classHits,
      styleHits,
      legacyFree,
      primeng,
      ngBootstrap,
      tumUi,
      lockedResidue: 0,
      lockedDirs: 0,
      lockableDirs: 0,
      pages: 0,
      pagesClean: 0,
    },
    sections: s.sections[module] ? { [module]: s.sections[module] } : {},
  }
}

export function scopeDetail(d: DetailView, module: string): DetailView {
  const prefix = `app/${module}/`
  return {
    ...d,
    lockGlobs: d.lockGlobs.filter((g) =>
      g.startsWith(`src/main/webapp/${prefix}`),
    ),
    lockable: d.lockable.filter((l) => l.dir.startsWith(prefix)),
    sections: d.sections.filter((s) => s.name === module),
    units: d.units.filter((u) => u.section === module),
    styles: d.styles.filter((f) => f.section === module),
    files: d.files.filter((f) => f.section === module),
    diagnostics: d.diagnostics.filter((x) => x.path.startsWith(prefix)),
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
      lockedDirs: detail.lockGlobs.length,
      lockableDirs: detail.lockable.length,
      pages: pages.length,
      pagesClean: pages.filter(
        (u) => hits(u) + u.closureHits + u.routeHits === 0,
      ).length,
    },
  }
}
