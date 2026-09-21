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
import type { Detail, InventoryEntry } from './model'
import { number } from './format'
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
