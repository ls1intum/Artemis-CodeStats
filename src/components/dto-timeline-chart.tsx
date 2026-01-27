"use client"

import type { DtoViolationsReport } from "../../report/types"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts"

interface DtoTimelineChartProps {
  data: DtoViolationsReport[]
  currentIndex: number
}

export function DtoTimelineChart({ data, currentIndex }: DtoTimelineChartProps) {
  const processData = () => {
    const sortedData = [...data].sort(
      (a, b) => a.metadata.artemis.commitDate.getTime() - b.metadata.artemis.commitDate.getTime()
    )

    return sortedData.map((report) => {
      const violations = report.dtoViolations
      const totals = violations.totals
      const total = totals.entityReturnViolations + totals.entityInputViolations + totals.dtoEntityFieldViolations

      // Count compliant modules (0 violations)
      const compliantModules = Object.values(violations.modules).filter(
        (m) => m.entityReturnViolations === 0 && m.entityInputViolations === 0 && m.dtoEntityFieldViolations === 0
      ).length
      const totalModules = Object.keys(violations.modules).length

      const date = report.metadata.artemis.commitDate
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`

      return {
        date: formattedDate,
        fullDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        commitHash: report.metadata.artemis.commitHash.substring(0, 8),
        total,
        entityReturn: totals.entityReturnViolations,
        entityInput: totals.entityInputViolations,
        dtoField: totals.dtoEntityFieldViolations,
        compliantModules,
        totalModules,
        compliancePercent: totalModules > 0 ? Math.round((compliantModules / totalModules) * 100) : 0,
      }
    })
  }

  const chartData = processData()
  const currentDataPoint = chartData.find(
    (d) => d.commitHash === data[currentIndex].metadata.artemis.commitHash.substring(0, 8)
  )

  // Calculate trend line
  const firstPoint = chartData[0]
  const lastPoint = chartData[chartData.length - 1]
  const velocityPerDay = chartData.length > 1
    ? (lastPoint.total - firstPoint.total) / chartData.length
    : 0

  // Estimate days to zero (if velocity is negative)
  const daysToZero = velocityPerDay < 0 ? Math.ceil(lastPoint.total / Math.abs(velocityPerDay)) : null

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ReturnType<typeof processData>[0] }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md">
          <p className="font-medium text-slate-900">{d.fullDate}</p>
          <p className="text-xs text-slate-500">Commit: {d.commitHash}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm font-bold">Total: {d.total} violations</p>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>Entity Returns: {d.entityReturn}</p>
              <p>Entity Inputs: {d.entityInput}</p>
              <p>DTO Fields: {d.dtoField}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs">
              <span className="font-medium">Compliant Modules:</span> {d.compliantModules}/{d.totalModules}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // If only 1 data point, show a message
  if (chartData.length < 2) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
        <div className="text-lg font-medium">Timeline Coming Soon</div>
        <p className="text-sm mt-2 text-center max-w-md">
          Historical trend data will appear here once more reports are generated.
          Currently showing {chartData.length} data point.
        </p>
        {chartData.length === 1 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Current:</span> {chartData[0].total} violations
              ({chartData[0].compliantModules}/{chartData[0].totalModules} modules compliant)
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value, index) =>
                index % Math.max(1, Math.floor(chartData.length / 10)) === 0 ? value : ""
              }
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, 'auto']}
              label={{
                value: "Violations",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{
                value: "Modules Compliant %",
                angle: -90,
                position: "insideRight",
                offset: 0,
                style: { textAnchor: "middle" },
              }}
            />

            {currentDataPoint && (
              <ReferenceLine
                x={currentDataPoint.date}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="3 3"
                yAxisId="left"
                label={{
                  value: "Current",
                  position: "top",
                  fill: "#0284c7",
                  fontSize: 12,
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  total: "Total Violations",
                  entityReturn: "Entity Returns",
                  entityInput: "Entity Inputs",
                  dtoField: "DTO Fields",
                  compliancePercent: "% Compliant",
                }
                return labels[value] || value
              }}
            />

            {/* Area for total violations */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="total"
              fill="#fee2e2"
              stroke="#ef4444"
              strokeWidth={3}
            />

            {/* Individual violation type lines */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="entityReturn"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              strokeDasharray="3 3"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="entityInput"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="3 3"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="dtoField"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              strokeDasharray="3 3"
            />

            {/* Compliance percentage line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="compliancePercent"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Velocity indicator */}
      {velocityPerDay !== 0 && (
        <div className="flex justify-center gap-6 text-sm">
          <div className={`px-3 py-1 rounded ${velocityPerDay < 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <span className="font-medium">Velocity:</span> {velocityPerDay > 0 ? '+' : ''}{velocityPerDay.toFixed(1)} violations/report
          </div>
          {daysToZero && daysToZero > 0 && daysToZero < 365 && (
            <div className="px-3 py-1 rounded bg-blue-100 text-blue-800">
              <span className="font-medium">Est. completion:</span> ~{daysToZero} reports to 0 violations
            </div>
          )}
        </div>
      )}
    </div>
  )
}
