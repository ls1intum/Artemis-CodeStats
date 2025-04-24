"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

interface ComponentInventoryData {
  [module: string]: {
    components: number
    directives: number
    pipes: number
    injectables: number
    total: number
  }
}

interface ComponentInventoryChartProps {
  data: ComponentInventoryData
}

export function ComponentInventoryChart({ data }: ComponentInventoryChartProps) {
  // Transform data for the chart with null check
  const chartData = Object.entries(data || {})
    .map(([module, values]) => ({
      module,
      components: values.components || 0,
      directives: values.directives || 0,
      pipes: values.pipes || 0,
      injectables: values.injectables || 0,
    }))
    .sort((a, b) => {
      // Calculate total for sorting
      const totalA = a.components + a.directives + a.pipes + a.injectables
      const totalB = b.components + b.directives + b.pipes + b.injectables
      return totalB - totalA
    })
    .slice(0, 10) // Show only top 10 modules for better visibility

  // If no data, return a placeholder
  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ left: 0, right: 20, top: 10, bottom: 40 }} barGap={0} barCategoryGap={8}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="module" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="components" stackId="a" name="Components" fill="var(--chart-1)" />
        <Bar dataKey="directives" stackId="a" name="Directives" fill="var(--chart-2)" />
        <Bar dataKey="pipes" stackId="a" name="Pipes" fill="var(--chart-3)" />
        <Bar dataKey="injectables" stackId="a" name="Injectables" fill="var(--chart-4)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
