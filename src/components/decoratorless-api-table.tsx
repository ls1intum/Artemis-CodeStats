import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DecoratorlessAPIStats } from "../../report/client/decoratorlessApi"

interface DecoratorlessAPITableProps {
  data: Record<string, DecoratorlessAPIStats>
}

export function DecoratorlessAPITable({ data }: DecoratorlessAPITableProps) {
  // Transform the data for table presentation
  const tableData = Object.entries(data).map(([module, stats]) => ({
    module,
    ...stats
  })).sort((a, b) => b.total - a.total) // Sort by total usage count, descending

  // Calculate aggregates across all modules
  const totals = {
    inputFunction: 0,
    inputRequired: 0,
    inputDecorator: 0,
    outputFunction: 0,
    outputDecorator: 0,
    modelFunction: 0,
    viewChildFunction: 0,
    viewChildRequired: 0,
    viewChildrenFunction: 0,
    viewChildDecorator: 0,
    viewChildrenDecorator: 0,
    contentChildFunction: 0,
    contentChildRequired: 0,
    contentChildrenFunction: 0,
    contentChildDecorator: 0,
    contentChildrenDecorator: 0,
    total: 0,
  }

  tableData.forEach(row => {
    Object.keys(totals).forEach(key => {
      if (key !== 'module') {
        totals[key] += row[key]
      }
    })
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Module</TableHead>
            <TableHead className="text-center">input()</TableHead>
            <TableHead className="text-center">input.required()</TableHead>
            <TableHead className="text-center">@Input()</TableHead>
            <TableHead className="text-center">output()</TableHead>
            <TableHead className="text-center">@Output()</TableHead>
            <TableHead className="text-center">model()</TableHead>
            <TableHead className="text-center">viewChild()</TableHead>
            <TableHead className="text-center">@ViewChild()</TableHead>
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row) => (
            <TableRow key={row.module}>
              <TableCell className="font-medium">{row.module}</TableCell>
              <TableCell className="text-center">{row.inputFunction}</TableCell>
              <TableCell className="text-center">{row.inputRequired}</TableCell>
              <TableCell className="text-center">{row.inputDecorator}</TableCell>
              <TableCell className="text-center">{row.outputFunction}</TableCell>
              <TableCell className="text-center">{row.outputDecorator}</TableCell>
              <TableCell className="text-center">{row.modelFunction}</TableCell>
              <TableCell className="text-center">{row.viewChildFunction + row.viewChildRequired}</TableCell>
              <TableCell className="text-center">{row.viewChildDecorator}</TableCell>
              <TableCell className="text-center font-bold">{row.total}</TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Totals</TableCell>
            <TableCell className="text-center font-bold">{totals.inputFunction}</TableCell>
            <TableCell className="text-center font-bold">{totals.inputRequired}</TableCell>
            <TableCell className="text-center font-bold">{totals.inputDecorator}</TableCell>
            <TableCell className="text-center font-bold">{totals.outputFunction}</TableCell>
            <TableCell className="text-center font-bold">{totals.outputDecorator}</TableCell>
            <TableCell className="text-center font-bold">{totals.modelFunction}</TableCell>
            <TableCell className="text-center font-bold">{totals.viewChildFunction + totals.viewChildRequired}</TableCell>
            <TableCell className="text-center font-bold">{totals.viewChildDecorator}</TableCell>
            <TableCell className="text-center font-bold">{totals.total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}