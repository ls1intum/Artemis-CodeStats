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
import { sourceUrl, type Detail, type InventoryEntry } from './model'
import { number, short } from './format'
import { bootstrapTarget, kitTarget } from './targets'

function InventoryTable({
  entries,
  target,
  targetLabel,
}: {
  entries: InventoryEntry[]
  target?: (name: string) => string
  targetLabel?: string
}) {
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
            <TableCell className="text-right tabular-nums">
              {number(e.occurrences)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {number(e.units)}
            </TableCell>
            {target && (
              <TableCell className="text-muted-foreground">
                {target(e.name)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function Inventory({ detail }: { detail: Detail }) {
  const kit = new Set(detail.kit)
  const used = new Set(detail.inventory.tumUi.map((e) => e.name))
  const unused = detail.kit.filter((s) => !used.has(s))
  const scroll = 'max-h-[32rem] overflow-auto'
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>What remains, and what replaces it</h2>
        </CardTitle>
        <CardDescription>
          Legacy classes, elements, directives and services still in the client
          at this snapshot, with the replacement the Artemis guideline names
          where it names one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bootstrap">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="bootstrap">
              Bootstrap classes ({detail.inventory.bootstrap.length})
            </TabsTrigger>
            <TabsTrigger value="primeng">
              PrimeNG ({detail.inventory.primeng.length})
            </TabsTrigger>
            <TabsTrigger value="ngBootstrap">
              ng-bootstrap ({detail.inventory.ngBootstrap.length})
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
              entries={detail.inventory.bootstrap}
              target={bootstrapTarget}
              targetLabel="Target"
            />
          </TabsContent>
          <TabsContent value="primeng" className={scroll}>
            <InventoryTable
              entries={detail.inventory.primeng}
              target={(n) => kitTarget(n, kit)}
              targetLabel="Kit equivalent"
            />
          </TabsContent>
          <TabsContent value="ngBootstrap" className={scroll}>
            <InventoryTable entries={detail.inventory.ngBootstrap} />
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
                        {short(f.path)}
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
            <InventoryTable entries={detail.inventory.tumUi} />
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
