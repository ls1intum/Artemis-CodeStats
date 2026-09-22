import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryOf, sourceUrl, type InventoryEntry } from './model'
import type { DetailView } from './load-report'
import { number } from './format'
import { ValueDelta } from './status'
import { bootstrapTarget, kitCoverage, kitTarget, ngbTarget } from './targets'

function InventoryTable({
  entries,
  previous,
  target,
  targetLabel,
  positive = 'down',
}: {
  entries: InventoryEntry[]
  previous: InventoryEntry[]
  target?: (name: string) => string
  targetLabel?: string
  positive?: 'down' | 'up'
}) {
  const before = new Map(previous.map((e) => [e.name, e]))
  // Entries that disappeared since the comparison are progress worth seeing too.
  const gone = previous.filter((e) => !entries.some((x) => x.name === e.name))
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Occurrences</TableHead>
          <TableHead className="text-right">Units</TableHead>
          {target && <TableHead>{targetLabel}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.name}>
            <TableCell>
              <code>{e.name}</code>
            </TableCell>
            <TableCell className="text-right">
              <ValueDelta
                value={e.occurrences}
                previous={before.get(e.name)?.occurrences ?? 0}
                positive={positive}
              />
            </TableCell>
            <TableCell className="text-right">
              <ValueDelta
                value={e.units}
                previous={before.get(e.name)?.units ?? 0}
                positive={positive}
              />
            </TableCell>
            {target && (
              <TableCell className="text-muted-foreground">
                {target(e.name)}
              </TableCell>
            )}
          </TableRow>
        ))}
        {gone.map((e) => (
          <TableRow key={e.name} className="text-muted-foreground">
            <TableCell>
              <code className="line-through">{e.name}</code>
            </TableCell>
            <TableCell className="text-right">
              <ValueDelta
                value={0}
                previous={e.occurrences}
                positive={positive}
              />
            </TableCell>
            <TableCell className="text-right">
              <ValueDelta value={0} previous={e.units} positive={positive} />
            </TableCell>
            {target && <TableCell>gone since comparison</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Coverage({
  entries,
  target,
  library,
}: {
  entries: InventoryEntry[]
  target: (name: string) => string
  library: string
}) {
  const [covered, total] = kitCoverage(entries, target)
  const gaps = entries
    .filter((e) => {
      const t = target(e.name)
      return !t || t.startsWith('no ')
    })
    .filter((e) => /^(p-|ngb-|p[A-Z]|ngb[A-Z])/.test(e.name))
    .slice(0, 8)
  return (
    <p className="text-sm text-muted-foreground">
      {number(covered)} of {number(total)} {library} usages have a TUM UI
      component to move to.
      {gaps.length > 0 && (
        <>
          {' '}
          Largest gaps without a kit component:{' '}
          {gaps.map((g, i) => (
            <span key={g.name}>
              {i > 0 && ', '}
              <code>{g.name}</code> ({g.occurrences})
            </span>
          ))}
          .
        </>
      )}
    </p>
  )
}

const inventories = (detail: DetailView) => ({
  bootstrap: inventoryOf([
    ...detail.units.map((u) => u.tokens),
    ...detail.files.map((f) => f.tokens),
  ]),
  primeng: inventoryOf(detail.units.map((u) => u.primeng)),
  ngBootstrap: inventoryOf(detail.units.map((u) => u.ngBootstrap)),
  tumUi: inventoryOf(detail.units.map((u) => u.tumUi)),
})

export function Inventory({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  const kit = new Set(detail.kit)
  const inventory = inventories(detail)
  const previous = inventories(compare)
  const used = new Set(inventory.tumUi.map((e) => e.name))
  const unused = detail.kit.filter((s) => !used.has(s))
  const scroll = 'max-h-[32rem] overflow-auto'
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>What remains, and what replaces it</h2>
        </CardTitle>
        <CardDescription>
          Bootstrap classes, PrimeNG and ng-bootstrap elements, directives and
          services still in the client at this snapshot with their change
          against the comparison, and the Tailwind utility or TUM UI component
          that replaces them where the guideline or the kit provides one; plus
          kit usage and stylesheet residue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bootstrap">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="bootstrap">
              Bootstrap classes ({inventory.bootstrap.length})
            </TabsTrigger>
            <TabsTrigger value="primeng">
              PrimeNG ({inventory.primeng.length})
            </TabsTrigger>
            <TabsTrigger value="ngBootstrap">
              ng-bootstrap ({inventory.ngBootstrap.length})
            </TabsTrigger>
            <TabsTrigger value="tumUi">
              TUM UI kit ({detail.kit.length - unused.length} of{' '}
              {detail.kit.length} selectors used)
            </TabsTrigger>
            <TabsTrigger value="styles">
              Stylesheets ({detail.styles.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bootstrap" className={scroll}>
            <InventoryTable
              entries={inventory.bootstrap}
              previous={previous.bootstrap}
              target={bootstrapTarget}
              targetLabel="Target"
            />
          </TabsContent>
          <TabsContent value="primeng" className={`${scroll} grid gap-3`}>
            <Coverage
              entries={inventory.primeng}
              target={(n) => kitTarget(n, kit)}
              library="PrimeNG"
            />
            <InventoryTable
              entries={inventory.primeng}
              previous={previous.primeng}
              target={(n) => kitTarget(n, kit)}
              targetLabel="Kit component"
            />
          </TabsContent>
          <TabsContent value="ngBootstrap" className={`${scroll} grid gap-3`}>
            <Coverage
              entries={inventory.ngBootstrap}
              target={(n) => ngbTarget(n, kit)}
              library="ng-bootstrap"
            />
            <InventoryTable
              entries={inventory.ngBootstrap}
              previous={previous.ngBootstrap}
              target={(n) => ngbTarget(n, kit)}
              targetLabel="Kit component"
            />
          </TabsContent>
          <TabsContent value="styles" className={`${scroll} grid gap-3`}>
            <p className="text-sm text-muted-foreground">
              SCSS files with residue the stylelint lock rejects:{' '}
              <code>--bs-*</code> variables and raw colors, plus Bootstrap Sass
              imports that block removing the dependency. Files under{' '}
              <code>content/scss/themes</code> define the theme palette itself.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">--bs-* vars</TableHead>
                  <TableHead className="text-right">Raw colors</TableHead>
                  <TableHead className="text-right">Sass imports</TableHead>
                  <TableHead className="text-right">Used by units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.styles.map((f) => (
                  <TableRow key={f.path}>
                    <TableCell className="whitespace-normal">
                      <a
                        className="break-all underline underline-offset-4"
                        href={sourceUrl(detail.commit, f.path)}
                      >
                        {f.path}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.variables || ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.colors || ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.imports || ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.units || ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="tumUi" className={`${scroll} grid gap-4`}>
            <InventoryTable
              entries={inventory.tumUi}
              previous={previous.tumUi}
              positive="up"
            />
            {unused.length > 0 && (
              <p className="text-sm text-muted-foreground">
                In the kit, not used by the client yet:{' '}
                {unused.map((s) => (
                  <code key={s} className="mr-1">
                    {s}
                  </code>
                ))}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
