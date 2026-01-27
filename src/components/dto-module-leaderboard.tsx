"use client"

import { useState } from "react"
import { Trophy, Medal, ChevronDown, ChevronUp, ArrowUpDown, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { DtoViolationsReport } from "../../report/types"

interface DtoModuleLeaderboardProps {
  currentReport: DtoViolationsReport
  compareReport: DtoViolationsReport
}

type SortKey = 'name' | 'total' | 'entityReturn' | 'entityInput' | 'dtoField' | 'fixed'
type SortDirection = 'asc' | 'desc'

export function DtoModuleLeaderboard({ currentReport, compareReport }: DtoModuleLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const processData = () => {
    const currentModules = currentReport.dtoViolations.modules
    const compareModules = compareReport.dtoViolations.modules

    return Object.entries(currentModules).map(([moduleName, stats]) => {
      const totalViolations = stats.entityReturnViolations + stats.entityInputViolations + stats.dtoEntityFieldViolations

      const prevStats = compareModules[moduleName]
      const prevTotal = prevStats
        ? prevStats.entityReturnViolations + prevStats.entityInputViolations + prevStats.dtoEntityFieldViolations
        : totalViolations

      const fixed = prevTotal - totalViolations

      return {
        name: moduleName,
        entityReturn: stats.entityReturnViolations,
        entityInput: stats.entityInputViolations,
        dtoField: stats.dtoEntityFieldViolations,
        total: totalViolations,
        fixed,
        isCompliant: totalViolations === 0,
      }
    })
  }

  const sortData = (data: ReturnType<typeof processData>) => {
    return [...data].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'total':
          comparison = a.total - b.total
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
        case 'fixed':
          comparison = a.fixed - b.fixed
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // Only show medals for modules that actually fixed violations
  const getFixedRank = (data: ReturnType<typeof processData>) => {
    const modulesWithFixes = data.filter(m => m.fixed > 0).sort((a, b) => b.fixed - a.fixed)
    const rankMap: Record<string, number> = {}

    let currentRank = 1
    let prevFixed: number | null = null
    modulesWithFixes.forEach((module, index) => {
      if (prevFixed !== module.fixed) {
        currentRank = index + 1
      }
      rankMap[module.name] = currentRank
      prevFixed = module.fixed
    })
    return rankMap
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' ? 'asc' : key === 'fixed' ? 'desc' : 'desc')
    }
  }

  const data = sortData(processData())
  const fixedRanks = getFixedRank(processData())

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />
    return null
  }

  const SortHeader = ({ column, label, align = 'left' }: { column: SortKey; label: string; align?: 'left' | 'right' }) => (
    <Button
      variant="ghost"
      className={`p-0 h-auto font-medium hover:bg-transparent ${align === 'right' ? 'w-full justify-end' : ''}`}
      onClick={() => handleSort(column)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === column ? (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </Button>
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16"><SortHeader column="name" label="Module" /></TableHead>
          <TableHead className="w-20 text-right"><SortHeader column="total" label="Total" align="right" /></TableHead>
          <TableHead className="w-20 text-right"><SortHeader column="entityReturn" label="Returns" align="right" /></TableHead>
          <TableHead className="w-20 text-right"><SortHeader column="entityInput" label="Inputs" align="right" /></TableHead>
          <TableHead className="w-20 text-right"><SortHeader column="dtoField" label="Fields" align="right" /></TableHead>
          <TableHead className="w-20 text-right"><SortHeader column="fixed" label="Fixed" align="right" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((module) => (
          <TableRow key={module.name} className={module.isCompliant ? 'bg-green-50' : ''}>
            <TableCell>
              <div className="flex items-center gap-2">
                {fixedRanks[module.name] && fixedRanks[module.name] <= 3 && getMedalIcon(fixedRanks[module.name])}
                {module.isCompliant && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <span className={module.isCompliant ? 'font-medium text-green-700' : ''}>
                  {module.name}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <span className={`font-bold ${module.isCompliant ? 'text-green-600' : ''}`}>
                {module.total}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{module.entityReturn}</TableCell>
            <TableCell className="text-right tabular-nums">{module.entityInput}</TableCell>
            <TableCell className="text-right tabular-nums">{module.dtoField}</TableCell>
            <TableCell className="text-right">
              {module.fixed > 0 ? (
                <Badge variant="default" className="bg-green-600">+{module.fixed}</Badge>
              ) : module.fixed < 0 ? (
                <Badge variant="destructive">{module.fixed}</Badge>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
