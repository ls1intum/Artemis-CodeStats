"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ChangeDetectionData {
  [module: string]: {
    onPush: number
    default: number
    implicit: number
    total: number
  }
}

interface ChangeDetectionTableProps {
  data: ChangeDetectionData
}

export function ChangeDetectionTable({ data }: ChangeDetectionTableProps) {
  // Handle empty data
  if (!data || Object.keys(data).length === 0) {
    return <div className="p-4 text-center">No change detection data available</div>
  }

  // Calculate totals
  const totals = Object.values(data).reduce(
    (acc, curr) => {
      acc.onPush += curr.onPush || 0
      acc.default += curr.default || 0
      acc.implicit += curr.implicit || 0
      acc.total += curr.total || 0
      return acc
    },
    { onPush: 0, default: 0, implicit: 0, total: 0 },
  )

  // Sort modules by total count (descending)
  const sortedModules = Object.keys(data).sort((a, b) => (data[b].total || 0) - (data[a].total || 0))

  // Calculate percentages for OnPush
  const calculateOnPushPercentage = (module: string) => {
    const { onPush = 0, total = 0 } = data[module]
    return total > 0 ? Math.round((onPush / total) * 100) : 0
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Module</TableHead>
            <TableHead className="text-right">OnPush</TableHead>
            <TableHead className="text-right">Default</TableHead>
            <TableHead className="text-right">Implicit</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">OnPush %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModules.map((module) => (
            <TableRow key={module}>
              <TableCell className="font-medium">{module}</TableCell>
              <TableCell className="text-right">{data[module].onPush || 0}</TableCell>
              <TableCell className="text-right">{data[module].default || 0}</TableCell>
              <TableCell className="text-right">{data[module].implicit || 0}</TableCell>
              <TableCell className="text-right">{data[module].total || 0}</TableCell>
              <TableCell className="text-right">{calculateOnPushPercentage(module)}%</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">TOTAL</TableCell>
            <TableCell className="text-right font-bold">{totals.onPush}</TableCell>
            <TableCell className="text-right font-bold">{totals.default}</TableCell>
            <TableCell className="text-right font-bold">{totals.implicit}</TableCell>
            <TableCell className="text-right font-bold">{totals.total}</TableCell>
            <TableCell className="text-right font-bold">
              {totals.total > 0 ? Math.round((totals.onPush / totals.total) * 100) : 0}%
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
