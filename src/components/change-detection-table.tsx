"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChangeDetectionStats } from "../../report/client/changeDetection"

interface ChangeDetectionTableProps {
  data: Record<string, ChangeDetectionStats>
}

export function ChangeDetectionTable({ data }: ChangeDetectionTableProps) {
  // Transform the data for table presentation
  const tableData = Object.entries(data).map(([module, stats]) => ({
    module,
    ...stats,
    onPushPercentage: stats.total > 0 ? (stats.explicitOnPush / stats.total) * 100 : 0
  })).sort((a, b) => b.total - a.total) // Sort by total components, descending

  // Calculate aggregates across all modules
  const totals = {
    explicitOnPush: 0,
    explicitDefault: 0,
    implicitDefault: 0,
    total: 0
  }

  tableData.forEach(row => {
    totals.explicitOnPush += row.explicitOnPush
    totals.explicitDefault += row.explicitDefault
    totals.implicitDefault += row.implicitDefault
    totals.total += row.total
  })

  const totalOnPushPercentage = totals.total > 0 ? (totals.explicitOnPush / totals.total) * 100 : 0

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Module</TableHead>
            <TableHead className="text-center">OnPush Strategy</TableHead>
            <TableHead className="text-center">Default Strategy</TableHead>
            <TableHead className="text-center">Implicit Default</TableHead>
            <TableHead className="text-center">Total Components</TableHead>
            <TableHead className="text-center">OnPush %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row) => (
            <TableRow key={row.module}>
              <TableCell className="font-medium">{row.module}</TableCell>
              <TableCell className="text-center">{row.explicitOnPush}</TableCell>
              <TableCell className="text-center">{row.explicitDefault}</TableCell>
              <TableCell className="text-center">{row.implicitDefault}</TableCell>
              <TableCell className="text-center">{row.total}</TableCell>
              <TableCell className="text-center">
                {row.onPushPercentage.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Totals</TableCell>
            <TableCell className="text-center font-bold">{totals.explicitOnPush}</TableCell>
            <TableCell className="text-center font-bold">{totals.explicitDefault}</TableCell>
            <TableCell className="text-center font-bold">{totals.implicitDefault}</TableCell>
            <TableCell className="text-center font-bold">{totals.total}</TableCell>
            <TableCell className="text-center font-bold">
              {totalOnPushPercentage.toFixed(1)}%
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
