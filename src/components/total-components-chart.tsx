import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface ComponentInventoryData {
  [module: string]: {
    components: number
    directives: number
    pipes: number
    injectables: number
    total: number
  }
}

interface TotalComponentsChartProps {
  data: ComponentInventoryData
}

export function TotalComponentsChart({ data }: TotalComponentsChartProps) {
  // Transform data for the chart
  const chartData = Object.entries(data || {})
    .map(([module, values]) => ({
      module,
      total: values.total,
    }))
    .sort((a, b) => b.total - a.total)

  // If no data, return a placeholder
  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="module" width={80} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => [`${value} artifacts`, "Total"]}
          labelFormatter={(label) => `Module: ${label}`}
        />
        <Bar dataKey="total" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
