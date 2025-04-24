import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ComponentInventoryData {
  [module: string]: {
    components: number
    directives: number
    pipes: number
    injectables: number
    total: number
  }
}

interface ComponentInventoryTableProps {
  data: ComponentInventoryData
}

export function ComponentInventoryTable({ data }: ComponentInventoryTableProps) {
  // Handle empty data
  if (!data || Object.keys(data).length === 0) {
    return <div className="p-4 text-center">No component inventory data available</div>
  }

  // Calculate totals
  const totals = Object.values(data).reduce(
    (acc, curr) => {
      acc.components += curr.components || 0
      acc.directives += curr.directives || 0
      acc.pipes += curr.pipes || 0
      acc.injectables += curr.injectables || 0
      acc.total += curr.total || 0
      return acc
    },
    { components: 0, directives: 0, pipes: 0, injectables: 0, total: 0 },
  )

  // Sort modules by total count (descending)
  const sortedModules = Object.keys(data).sort((a, b) => (data[b].total || 0) - (data[a].total || 0))

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Module</TableHead>
            <TableHead className="text-right">Components</TableHead>
            <TableHead className="text-right">Directives</TableHead>
            <TableHead className="text-right">Pipes</TableHead>
            <TableHead className="text-right">Injectables</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModules.map((module) => (
            <TableRow key={module}>
              <TableCell className="font-medium">{module}</TableCell>
              <TableCell className="text-right">{data[module].components || 0}</TableCell>
              <TableCell className="text-right">{data[module].directives || 0}</TableCell>
              <TableCell className="text-right">{data[module].pipes || 0}</TableCell>
              <TableCell className="text-right">{data[module].injectables || 0}</TableCell>
              <TableCell className="text-right font-semibold">{data[module].total || 0}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">TOTAL</TableCell>
            <TableCell className="text-right font-bold">{totals.components}</TableCell>
            <TableCell className="text-right font-bold">{totals.directives}</TableCell>
            <TableCell className="text-right font-bold">{totals.pipes}</TableCell>
            <TableCell className="text-right font-bold">{totals.injectables}</TableCell>
            <TableCell className="text-right font-bold">{totals.total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
