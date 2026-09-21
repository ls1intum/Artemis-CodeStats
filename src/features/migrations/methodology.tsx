import { ExternalLink } from 'lucide-react'
import { sourceUrl, commitUrl, type Manifest, type Snapshot } from './model'

export function Methodology({
  data,
  current,
}: {
  data: Manifest
  current: Snapshot
}) {
  return (
    <section className="migration-panel" aria-labelledby="method-title">
      <h2 id="method-title">Trust the evidence. Know its limits.</h2>
      <div className="grid gap-6 md:grid-cols-2 mt-5 text-sm leading-relaxed">
        <div>
          <h3 className="font-semibold mb-2">Coverage & provenance</h3>
          <p>
            TypeScript imports, Angular external and literal inline templates,
            and CSS/SCSS token references in app and global content sources.
            Tests, stories, declarations and the kit’s own implementation are
            excluded. Baseline:{' '}
            <a className="migration-link" href={commitUrl(data.baseline)}>
              July 17 owned-kit pilot
            </a>
            ; package extraction:{' '}
            <a
              className="migration-link"
              href={commitUrl(data.packageAdoption)}
            >
              August 4 adoption
            </a>
            .
          </p>
          <p className="mt-3">
            Bootstrap rules are pinned to{' '}
            <a
              className="migration-link"
              href={sourceUrl(
                '6d7f286184ec6546ba15beac26dd21600a498fba',
                'rules/no-bootstrap-classes.mjs',
              )}
            >
              Artemis’s own lint policy
            </a>
            . Shared classes such as <code>p-3</code> are deliberately not
            assigned to either framework.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">
            Not a visual-quality or completion certificate
          </h3>
          <p>
            Dynamic class construction, computed templates, wrapper dependencies
            and some directives are not resolved. Imports are dependency
            evidence, not runtime usage. Tailwind is a conservative signal, not
            exhaustive coverage. Deleted files and module moves can reduce
            counts without a migration. Manual light/dark, responsive, keyboard
            and assistive-technology checks remain required.
          </p>
          <p className="mt-3">
            Do not sum dimensions, rank individual contributors, or forecast a
            completion date from these counts. A smaller legacy footprint is
            useful evidence, not proof of feature parity.
          </p>
        </div>
      </div>
      <details className="mt-5">
        <summary>Analysis diagnostics ({current.diagnostics.length})</summary>
        {current.diagnostics.length ? (
          <ul className="mt-3 text-sm space-y-2">
            {current.diagnostics.map((d, i) => (
              <li key={i}>
                <a
                  className="migration-link"
                  href={sourceUrl(current.commit, d.path)}
                >
                  {d.path}
                </a>
                : {d.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">
            No Angular template parse errors in this snapshot. This does not
            remove the documented coverage limits.
          </p>
        )}
      </details>
      <a
        className="migration-link inline-flex items-center gap-1 mt-5 text-sm"
        href="https://github.com/ls1intum/Artemis-CodeStats/blob/main/docs/migration-dashboard.md"
      >
        Architecture, quality rubric & A+ release gates{' '}
        <ExternalLink size={13} />
      </a>
    </section>
  )
}
