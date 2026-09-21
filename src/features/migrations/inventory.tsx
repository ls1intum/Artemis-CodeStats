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

// Targets from the Bootstrap → TUM UI/Tailwind quick reference in Artemis's client-development
// guideline, anchored to the class families the guideline names; other tokens get no target.
export const bootstrapTargets: [RegExp, string][] = [
  [/^btn-group(-.+)?$/, 'tum-ui-button-group'],
  [/^btn(-.+)?$/, 'tum-ui-button / tumUiButton'],
  [/^badge$/, 'tum-ui-tag'],
  [/^alert(-.+)?$/, 'tum-ui-message'],
  [/^card(-.+)?$/, 'tum-ui-card / tum-ui-panel'],
  [/^table(-.+)?$/, 'tum-ui-table / tumUiTable'],
  [/^form-check(-.+)?$/, 'tum-ui-checkbox / tum-ui-radio-button'],
  [/^form-select$/, 'tum-ui-select'],
  [/^form-(control(-.+)?|range|floating)$/, 'tumUiInput'],
  [
    /^(form-(group|label|text)|col-form-label(-.+)?|(valid|invalid)-feedback)$/,
    'tum-ui-form-field',
  ],
  [/^input-group(-.+)?$/, 'tum-ui-input-group'],
  [
    /^(row|col|col-.+|g[xy]?-[0-5])$/,
    'grid grid-cols-12 + col-span-* / flex + gap-*',
  ],
  [/^d-none$/, 'hidden'],
  [/^d-(sm|md|lg|xl|xxl)-/, 'md:flex / md:hidden …'],
  [/^d-/, 'flex / block / grid / inline-block'],
  [/^justify-content-/, 'justify-*'],
  [/^align-items-/, 'items-*'],
  [/^align-self-/, 'self-*'],
  [/^align-content-/, 'content-*'],
  [/^flex-column/, 'flex-col'],
  [/^flex-(grow|shrink)-/, 'grow / shrink'],
  [/^flex-fill$/, 'flex-1'],
  [/^text-(muted|body(-.+)?|secondary|light|dark)$/, '--text-body-secondary'],
  [
    /^(text|border|bg)-(danger|success|warning|info)$/,
    'text-state-* / bg-state-* / border-state-*',
  ],
  [/^(modal|offcanvas)(-.+)?$/, 'tum-ui-dialog'],
  [/^dropdown(-.+)?$/, 'tum-ui-menu'],
  [/^nav(-(link|item|tabs|pills|fill|justified|underline))?$/, 'tum-ui-tabs'],
  [/^(pagination|page-link|page-item)$/, 'tum-ui-paginator'],
  [/^spinner-(border|grow)(-sm)?$/, 'tum-ui-progress-spinner'],
  [/^popover(-.+)?$/, 'tum-ui-popover'],
  [/^toast(-.+)?$/, 'tum-ui-message'],
  [/^list-group(-.+)?$/, 'tum-ui-list'],
  [
    /^(accordion(-.+)?|collapse|collapsing|collapse-horizontal)$/,
    'tum-ui-panel',
  ],
  [/^[hw]-(25|50|75|100)$/, 'w-full / h-full or an explicit size'],
  [/^(close|btn-close)$/, 'tum-ui-button'],
  [/^visually-hidden(-focusable)?$/, 'sr-only'],
  [/^text-truncate$/, 'truncate'],
]
export const bootstrapTarget = (name: string) =>
  bootstrapTargets.find(([re]) => re.test(name))?.[1] ?? ''

// A PrimeNG element or directive maps to a kit selector only when the kit ships that selector.
export const kitTarget = (name: string, kit: Set<string>) => {
  const candidates = /^p-/.test(name)
    ? [
        `tum-ui-${name.slice(2)}`,
        `tum-ui-${name.slice(2).replace(/(bar|spinner|switch|button|number|picker|dialog|field|group)$/, '-$1')}`,
      ]
    : /^p[A-Z]/.test(name)
      ? [`tumUi${name.slice(1)}`]
      : []
  return candidates.find((c) => kit.has(c)) ?? ''
}

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
