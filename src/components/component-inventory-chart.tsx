"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ModuleStats } from "../../report/client/componentInventory"

interface ComponentInventoryChartProps {
  data: Record<string, ModuleStats>
}

export function ComponentInventoryChart({ data }: ComponentInventoryChartProps) {
  // Calculate totals across all modules
  const totals = {
    components: 0,
    directives: 0,
    pipes: 0,
    injectables: 0,
  }

  Object.values(data).forEach(stats => {
    totals.components += stats.components
    totals.directives += stats.directives
    totals.pipes += stats.pipes
    totals.injectables += stats.injectables
  })

  const chartData = [
    { name: 'Components', value: totals.components, color: '#0088FE' },
    { name: 'Directives', value: totals.directives, color: '#00C49F' },
    { name: 'Pipes', value: totals.pipes, color: '#FFBB28' },
    { name: 'Injectables', value: totals.injectables, color: '#FF8042' }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} items`, '']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
