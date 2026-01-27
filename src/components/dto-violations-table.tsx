"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { DtoViolationsReport } from "../../report/types"

interface DtoViolationsTableProps {
  data: DtoViolationsReport
}

type SortKey = 'name' | 'entityReturn' | 'entityInput' | 'dtoField' | 'total'
type SortDirection = 'asc' | 'desc'

export function DtoViolationsTable({ data }: DtoViolationsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const processData = () => {
    return Object.entries(data.dtoViolations.modules).map(([moduleName, stats]) => ({
      name: moduleName,
      entityReturn: stats.entityReturnViolations,
      entityInput: stats.entityInputViolations,
      dtoField: stats.dtoEntityFieldViolations,
      total: stats.entityReturnViolations + stats.entityInputViolations + stats.dtoEntityFieldViolations,
    }))
  }

  const sortData = (modules: ReturnType<typeof processData>) => {
    return [...modules].sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'entityReturn':
          comparison = a.entityReturn - b.entityReturn
          break
        case 'entityInput':
          comparison = a.entityInput - b.entityInput
          break
        case 'dtoField':
          comparison = a.dtoField - b.dtoField
          break
        case 'total':
          comparison = a.total - b.total
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' ? 'asc' : 'desc')
    }
  }

  const modules = sortData(processData())
  const totals = data.dtoViolations.totals

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      className="p-0 font-medium flex items-center gap-1"
      onClick={() => handleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
      )}
    </Button>
  )

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortButton column="name" label="Module" /></TableHead>
            <TableHead className="text-right"><SortButton column="entityReturn" label="Entity Returns" /></TableHead>
            <TableHead className="text-right"><SortButton column="entityInput" label="Entity Inputs" /></TableHead>
            <TableHead className="text-right"><SortButton column="dtoField" label="DTO Fields" /></TableHead>
            <TableHead className="text-right"><SortButton column="total" label="Total" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((module) => (
            <TableRow key={module.name} className={module.total === 0 ? 'bg-green-50' : ''}>
              <TableCell className="font-medium">{module.name}</TableCell>
              <TableCell className="text-right font-mono">{module.entityReturn}</TableCell>
              <TableCell className="text-right font-mono">{module.entityInput}</TableCell>
              <TableCell className="text-right font-mono">{module.dtoField}</TableCell>
              <TableCell className="text-right font-bold">{module.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot>
          <TableRow className="bg-slate-100 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{totals.entityReturnViolations}</TableCell>
            <TableCell className="text-right">{totals.entityInputViolations}</TableCell>
            <TableCell className="text-right">{totals.dtoEntityFieldViolations}</TableCell>
            <TableCell className="text-right">
              {totals.entityReturnViolations + totals.entityInputViolations + totals.dtoEntityFieldViolations}
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  )
}
