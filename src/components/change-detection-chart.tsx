import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

interface ChangeDetectionData {
  [module: string]: {
    onPush: number
    default: number
    implicit: number
    total: number
  }
}

interface ChangeDetectionChartProps {
  data: ChangeDetectionData
}

export function ChangeDetectionChart({ data }: ChangeDetectionChartProps) {
  // Transform data for the chart with null check
  const chartData = Object.entries(data || {})
    .map(([module, values]) => ({
      module,
      onPush: values.onPush || 0,
      implicit: values.implicit || 0,
      total: values.total || 0,
      onPushPercentage: values.total > 0 ? Math.round((values.onPush / values.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // If no data, return a placeholder
  if (!chartData.length) {
    return <div className="flex h-full items-center justify-center">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ left: 0, right: 20, top: 10, bottom: 40 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="module" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} interval={0} />
        <YAxis />
        <Tooltip
          formatter={(value, name) => {
            if (name === "onPushPercentage") return [`${value}%`, "OnPush %"]
            return [value, name]
          }}
        />
        <Legend />
        <Bar dataKey="onPush" name="OnPush" fill="var(--chart-1)" />
        <Bar dataKey="implicit" name="Implicit" fill="var(--chart-2)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
