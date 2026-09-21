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
            <dt className="font-medium">Hit</dt>
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
              partials, helpers, global styles) are listed per section but do
              not count as units.
            </dd>
            <dt className="font-medium">Locked</dt>
            <dd>
              The unit's template path matches the regression-lock list in{' '}
              {link('eslint.config.mjs')} ({detail.lockGlobs.length} entries at
              this commit). A locked unit may still use PrimeNG.
            </dd>
            <dt className="font-medium">Bootstrap-free, unlocked</dt>
            <dd>
              Zero hits, not yet locked. It may still render Bootstrap through
              the units it imports.
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
