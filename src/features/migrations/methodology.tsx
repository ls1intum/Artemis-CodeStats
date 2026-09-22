import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { commitUrl, sourceUrl, type Manifest } from './model'
import type { DetailView } from './load-report'

export function Methodology({
  manifest,
  detail,
}: {
  manifest: Manifest
  detail: DetailView
}) {
  const unscanned = detail.units.filter(
    (u) => !u.scanned && Object.keys(u.tumUi).length > 0,
  ).length
  const link = (path: string, text = path) => (
    <a
      className="underline underline-offset-4"
      href={sourceUrl(detail.commit, path)}
    >
      {text}
    </a>
  )
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="method">
        <AccordionTrigger>How this is measured</AccordionTrigger>
        <AccordionContent className="grid max-w-4xl gap-3 text-sm leading-relaxed">
          <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium">Legacy</dt>
            <dd>
              Bootstrap, ng-bootstrap and PrimeNG, which the Artemis client
              guideline names as migration-only dependencies; the target is
              Tailwind for layout and the TUM UI kit for components. A unit is{' '}
              <em>legacy-free</em> when it has no Bootstrap hits and uses
              neither library; <em>PrimeNG or ng-bootstrap remain</em> when it
              is Bootstrap-free but still uses one of them (elements,
              directives, or services such as <code>DialogService</code> and{' '}
              <code>NgbModal</code>); <em>Bootstrap</em> otherwise.
            </dd>
            <dt className="font-medium">Bootstrap hit</dt>
            <dd>
              A class token matched by Artemis's own{' '}
              {link('rules/no-bootstrap-classes.mjs', 'no-bootstrap-classes')}{' '}
              rule at this commit, in templates (also inline templates and the
              static parts of interpolated class lists, which the lint does not
              scan) and in host class bindings and <code>addClass</code> calls;
              or, in SCSS, a <code>--bs-*</code> variable, a hex or{' '}
              <code>rgb()</code>/<code>hsl()</code> color, or a Bootstrap Sass
              import, which the stylelint lock rejects. Shared spacing utilities
              such as <code>mb-3</code> are not hits.
            </dd>
            <dt className="font-medium">Unit</dt>
            <dd>
              An Angular component or directive: its TypeScript file, external
              template and style files. Files owned by no unit (shared SCSS
              partials, helpers, global styles) are listed per module but do not
              count as units.
            </dd>
            <dt className="font-medium">Locked</dt>
            <dd>
              The Bootstrap gate: the unit's template path matches the
              regression-lock list in {link('eslint.config.mjs')} (
              {detail.lockGlobs.length} entries at this commit), so Bootstrap
              cannot return. Locking says nothing about PrimeNG or ng-bootstrap.
            </dd>
            <dt className="font-medium">Kit component</dt>
            <dd>
              The TUM UI selector that covers a PrimeNG or ng-bootstrap usage,
              matched against the kit sources of the same commit; usages without
              one are kit gaps.
            </dd>
            <dt className="font-medium">Imports with hits</dt>
            <dd>
              Units whose class this unit imports, transitively: standalone{' '}
              <code>imports</code>, dialogs opened from code and{' '}
              <code>import()</code> calls. Type-only imports do not count;
              content projected from outside a unit is not resolved.
            </dd>
            <dt className="font-medium">Spacing</dt>
            <dd>
              Bootstrap spacing-scale classes (<code>mb-3</code>,{' '}
              <code>gap-2</code>) that keep their names under Tailwind but
              change value once a directory is locked; convert by size.
            </dd>
            <dt className="font-medium">Lockable</dt>
            <dd>
              A directory with templates that is not locked, in which every unit
              and file has zero hits and imports nothing with hits. The copied
              entries follow the three lists that Artemis's{' '}
              {link(
                'rules/migration-source-coverage.spec.mjs',
                'migration-source-coverage',
              )}{' '}
              test keeps consistent.
            </dd>
            <dt className="font-medium">Module</dt>
            <dd>
              A top-level directory of the client (<code>app/course</code>,{' '}
              <code>app/exam</code>, …); <code>app</code> holds the root files
              and <code>content</code> the global styles. Selecting a module
              scopes every view to its units; imported units in other modules
              still count towards what blocks a page or unit.
            </dd>
            <dt className="font-medium">Snapshots</dt>
            <dd>
              Totals for every first-parent commit on develop since{' '}
              <a
                className="underline underline-offset-4"
                href={commitUrl(manifest.packageAdoption)}
              >
                package adoption
              </a>
              , collected hourly. Full unit detail is kept for weekly
              checkpoints, milestones and the latest commit. Analysis executes
              the rule module of the analyzed commit.
            </dd>
            <dt className="font-medium">Contributors</dt>
            <dd>
              Each commit's change in the totals is split between the people who
              worked on its pull request branch, which GitHub keeps after the
              squash merge. Every commit on that branch is measured: an author's
              share is the legacy they removed there (Bootstrap hits, PrimeNG
              and ng-bootstrap occurrences) plus the TUM UI usage they added,
              or, when nobody touched legacy, their client lines changed. Shares
              under 5% and work by authors without a GitHub account (unlinked
              addresses, coding agents) go to the pull request author, who drove
              that work. Only commits whose parent is the previous snapshot
              count (every commit since package adoption); a commit that changes
              the Bootstrap rule itself is not credited with its hit change;
              bots are not listed.
            </dd>
          </dl>
          <p>
            Class names built at runtime are not counted.
            {unscanned > 0 &&
              ` ${unscanned} units use TUM UI outside the Tailwind @source list, so their utilities are not generated.`}
          </p>
          {detail.diagnostics.length > 0 && (
            <p>
              {detail.diagnostics.length} template parse diagnostics:{' '}
              {detail.diagnostics.slice(0, 5).map((d) => (
                <span key={d.path}>{link(d.path)} </span>
              ))}
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
