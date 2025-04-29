import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ModuleStats } from "../../report/client/componentInventory"

interface ComponentInventoryTableProps {
  data: Record<string, ModuleStats>
}

export function ComponentInventoryTable({ data }: ComponentInventoryTableProps) {
  // Transform the data for table presentation
  const tableData = Object.entries(data).map(([module, stats]) => ({
    module,
    ...stats
  })).sort((a, b) => b.total - a.total) // Sort by total components, descending

  // Calculate aggregates across all modules
  const totals = {
    components: 0,
    directives: 0,
    pipes: 0,
    injectables: 0,
    total: 0
  }

  tableData.forEach(row => {
    totals.components += row.components
    totals.directives += row.directives
    totals.pipes += row.pipes
    totals.injectables += row.injectables
    totals.total += row.total
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Module</TableHead>
            <TableHead className="text-center">Components</TableHead>
            <TableHead className="text-center">Directives</TableHead>
            <TableHead className="text-center">Pipes</TableHead>
            <TableHead className="text-center">Injectables</TableHead>
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row) => (
            <TableRow key={row.module}>
              <TableCell className="font-medium">{row.module}</TableCell>
              <TableCell className="text-center">{row.components}</TableCell>
              <TableCell className="text-center">{row.directives}</TableCell>
              <TableCell className="text-center">{row.pipes}</TableCell>
              <TableCell className="text-center">{row.injectables}</TableCell>
              <TableCell className="text-center font-bold">{row.total}</TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Totals</TableCell>
            <TableCell className="text-center font-bold">{totals.components}</TableCell>
            <TableCell className="text-center font-bold">{totals.directives}</TableCell>
            <TableCell className="text-center font-bold">{totals.pipes}</TableCell>
            <TableCell className="text-center font-bold">{totals.injectables}</TableCell>
            <TableCell className="text-center font-bold">{totals.total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
