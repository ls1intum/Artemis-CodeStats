"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DtoViolationsReport } from "../../report/types"

interface DtoViolationHeatmapProps {
  currentReport: DtoViolationsReport
  compareReport: DtoViolationsReport
}

type SortBy = 'alphabetical' | 'total' | 'severity'

export function DtoViolationHeatmap({ currentReport, compareReport }: DtoViolationHeatmapProps) {
  const [sortBy, setSortBy] = useState<SortBy>('severity')

  const processData = () => {
    const currentModules = currentReport.dtoViolations.modules
    const compareModules = compareReport.dtoViolations.modules

    // Merge modules from both reports to handle added/removed modules
    const allModuleNames = new Set([
      ...Object.keys(currentModules),
      ...Object.keys(compareModules)
    ])

    const modules = Array.from(allModuleNames).map((name) => {
      const stats = currentModules[name] || { entityReturnViolations: 0, entityInputViolations: 0, dtoEntityFieldViolations: 0 }
      const prevStats = compareModules[name]
      const total = stats.entityReturnViolations + stats.entityInputViolations + stats.dtoEntityFieldViolations

      return {
        name,
        entityReturn: {
          count: stats.entityReturnViolations,
          change: prevStats ? stats.entityReturnViolations - prevStats.entityReturnViolations : 0,
        },
        entityInput: {
          count: stats.entityInputViolations,
          change: prevStats ? stats.entityInputViolations - prevStats.entityInputViolations : 0,
        },
        dtoField: {
          count: stats.dtoEntityFieldViolations,
          change: prevStats ? stats.dtoEntityFieldViolations - prevStats.dtoEntityFieldViolations : 0,
        },
        total,
      }
    })

    // Sort
    if (sortBy === 'alphabetical') {
      modules.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'total') {
      modules.sort((a, b) => b.total - a.total)
    } else if (sortBy === 'severity') {
      // Sort by total, but prioritize modules with high entity return violations
      modules.sort((a, b) => {
        const scoreA = a.entityReturn.count * 2 + a.entityInput.count * 1.5 + a.dtoField.count
        const scoreB = b.entityReturn.count * 2 + b.entityInput.count * 1.5 + b.dtoField.count
        return scoreB - scoreA
      })
    }

    return modules
  }

  // Color scale: 0 = green, 1-5 = yellow, 6-15 = orange, 16-30 = red, 31+ = dark red
  const getColorClass = (count: number) => {
    if (count === 0) return "bg-green-500"
    if (count <= 5) return "bg-yellow-400"
    if (count <= 15) return "bg-orange-500"
    if (count <= 30) return "bg-red-500"
    return "bg-red-700"
  }

  const getTextColor = (count: number) => {
    if (count === 0) return "text-green-900"
    return "text-white"
  }

  const data = processData()

  // Calculate column totals
  const totals = data.reduce(
    (acc, m) => ({
      entityReturn: acc.entityReturn + m.entityReturn.count,
      entityInput: acc.entityInput + m.entityInput.count,
      dtoField: acc.dtoField + m.dtoField.count,
    }),
    { entityReturn: 0, entityInput: 0, dtoField: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort modules by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="severity">Sort by Severity</SelectItem>
            <SelectItem value="total">Sort by Total</SelectItem>
            <SelectItem value="alphabetical">Sort Alphabetically</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left font-medium text-slate-700">Module</th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>Entity Returns</div>
                <div className="text-xs font-normal text-slate-500">Controllers returning @Entity</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>Entity Inputs</div>
                <div className="text-xs font-normal text-slate-500">@RequestBody with @Entity</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>DTO Fields</div>
                <div className="text-xs font-normal text-slate-500">DTOs containing @Entity</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((module, index) => (
              <tr key={module.name} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="p-2 font-medium border-t border-slate-200 whitespace-nowrap">
                  {module.name}
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-8 ${getColorClass(module.entityReturn.count)} rounded-sm flex items-center justify-center ${getTextColor(module.entityReturn.count)} text-sm font-bold`}
                    >
                      {module.entityReturn.count}
                    </div>
                    {module.entityReturn.change !== 0 && (
                      <div className={`text-xs mt-0.5 ${module.entityReturn.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {module.entityReturn.change < 0 ? '' : '+'}{module.entityReturn.change}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-8 ${getColorClass(module.entityInput.count)} rounded-sm flex items-center justify-center ${getTextColor(module.entityInput.count)} text-sm font-bold`}
                    >
                      {module.entityInput.count}
                    </div>
                    {module.entityInput.change !== 0 && (
                      <div className={`text-xs mt-0.5 ${module.entityInput.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {module.entityInput.change < 0 ? '' : '+'}{module.entityInput.change}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-8 ${getColorClass(module.dtoField.count)} rounded-sm flex items-center justify-center ${getTextColor(module.dtoField.count)} text-sm font-bold`}
                    >
                      {module.dtoField.count}
                    </div>
                    {module.dtoField.change !== 0 && (
                      <div className={`text-xs mt-0.5 ${module.dtoField.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {module.dtoField.change < 0 ? '' : '+'}{module.dtoField.change}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200 text-center font-bold">
                  {module.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 font-bold">
              <td className="p-2">Total</td>
              <td className="p-2 text-center">{totals.entityReturn}</td>
              <td className="p-2 text-center">{totals.entityInput}</td>
              <td className="p-2 text-center">{totals.dtoField}</td>
              <td className="p-2 text-center">{totals.entityReturn + totals.entityInput + totals.dtoField}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="text-xs text-slate-500">Violation Severity:</div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <div className="text-xs">0</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
            <div className="text-xs">1-5</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
            <div className="text-xs">6-15</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            <div className="text-xs">16-30</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-700 rounded-sm"></div>
            <div className="text-xs">31+</div>
          </div>
        </div>
      </div>
    </div>
  )
}
