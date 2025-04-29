"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChangeDetectionStats } from "../../report/client/changeDetection"

interface ChangeDetectionChartProps {
  data: Record<string, ChangeDetectionStats>
}

export function ChangeDetectionChart({ data }: ChangeDetectionChartProps) {
  // Transform and prepare data for the chart
  const chartData = Object.entries(data)
    .map(([module, stats]) => ({
      name: module,
      onPush: stats.explicitOnPush,
      defaultExplicit: stats.explicitDefault,
      defaultImplicit: stats.implicitDefault,
      total: stats.total,
      onPushPercentage: stats.total > 0 ? (stats.explicitOnPush / stats.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total) // Sort by total components descending
    .slice(0, 10) // Only show top 10 modules for readability

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end"
          height={70} 
        />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
        <Tooltip formatter={(value, name) => {
          if (name === "onPushPercentage") {
            return [`${value.toFixed(1)}%`, 'OnPush %']
          }
          return [value, name]
        }} />
        <Legend />
        <Bar yAxisId="left" dataKey="onPush" name="OnPush" fill="#4CAF50" stackId="a" />
        <Bar yAxisId="left" dataKey="defaultExplicit" name="Default (Explicit)" fill="#FFC107" stackId="a" />
        <Bar yAxisId="left" dataKey="defaultImplicit" name="Default (Implicit)" fill="#FF5722" stackId="a" />
        <Bar yAxisId="right" dataKey="onPushPercentage" name="OnPush %" fill="#2196F3" />
      </BarChart>
    </ResponsiveContainer>
  )
}
