"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ModuleStats } from "../../report/client/componentInventory"

interface TotalComponentsChartProps {
  data: Record<string, ModuleStats>
}

export function TotalComponentsChart({ data }: TotalComponentsChartProps) {
  // Transform data for chart display
  const chartData = Object.entries(data)
    .map(([module, stats]) => ({
      name: module,
      total: stats.total
    }))
    .sort((a, b) => b.total - a.total) // Sort by total components descending
    .slice(0, 15) // Only show top 15 modules for readability

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" width={150} dataKey="name" />
        <Tooltip 
          formatter={(value) => [`${value} components`, 'Total']}
          labelFormatter={(name) => `Module: ${name}`}
        />
        <Bar dataKey="total" fill="#8884d8" name="Total Components" />
      </BarChart>
    </ResponsiveContainer>
  )
}
