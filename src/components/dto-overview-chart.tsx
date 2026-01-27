"use client"

import type { DtoViolationsReport } from "../../report/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface DtoOverviewChartProps {
  currentReport: DtoViolationsReport
  compareReport: DtoViolationsReport
}

export function DtoOverviewChart({ currentReport, compareReport }: DtoOverviewChartProps) {
  const current = currentReport.dtoViolations.totals
  const compare = compareReport.dtoViolations.totals

  const data = [
    {
      name: "Entity Returns",
      description: "Controllers returning @Entity",
      current: current.entityReturnViolations,
      previous: compare.entityReturnViolations,
      change: current.entityReturnViolations - compare.entityReturnViolations,
    },
    {
      name: "Entity Inputs",
      description: "@RequestBody with @Entity",
      current: current.entityInputViolations,
      previous: compare.entityInputViolations,
      change: current.entityInputViolations - compare.entityInputViolations,
    },
    {
      name: "DTO Fields",
      description: "DTOs containing @Entity",
      current: current.dtoEntityFieldViolations,
      previous: compare.dtoEntityFieldViolations,
      change: current.dtoEntityFieldViolations - compare.dtoEntityFieldViolations,
    },
  ]

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof data[0] }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md">
          <p className="font-medium text-slate-900">{d.name}</p>
          <p className="text-xs text-slate-500">{d.description}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Current: <span className="font-bold">{d.current}</span></p>
            <p>Previous: {d.previous}</p>
            <p className={d.change < 0 ? 'text-green-600' : d.change > 0 ? 'text-red-600' : 'text-slate-500'}>
              Change: {d.change < 0 ? '' : d.change > 0 ? '+' : ''}{d.change}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const getBarColor = (index: number) => {
    const colors = ['#ef4444', '#f97316', '#eab308']
    return colors[index]
  }

  return (
    <div className="space-y-4">
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="current" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Change indicators */}
      <div className="grid grid-cols-3 gap-4">
        {data.map((item) => (
          <div key={item.name} className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">{item.name}</div>
            <div className="text-lg font-bold">{item.current}</div>
            {item.change !== 0 && (
              <div className={`text-xs font-medium ${item.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.change < 0 ? '↓' : '↑'} {Math.abs(item.change)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
