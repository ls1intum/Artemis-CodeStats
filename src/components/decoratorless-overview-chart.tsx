"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface DecoratorlessOverviewChartProps {
  data: DecoratorlessAPIReport
}

export function DecoratorlessOverviewChart({ data }: DecoratorlessOverviewChartProps) {
  // Process data for the chart
  const processData = () => {
    const decoratorlessAPI = data.decoratorlessAPI

    // Aggregate data across all modules
    const inputs = {
      decoratorless: 0,
      decorator: 0,
    }

    const outputs = {
      decoratorless: 0,
      decorator: 0,
    }

    const viewChildQueries = {
      decoratorless: 0,
      decorator: 0,
    }
    
    const viewChildrenQueries = {
      decoratorless: 0,
      decorator: 0,
    }
    
    const contentChildQueries = {
      decoratorless: 0,
      decorator: 0,
    }
    
    const contentChildrenQueries = {
      decoratorless: 0,
      decorator: 0,
    }

    Object.values(decoratorlessAPI).forEach((module) => {
      // Inputs
      inputs.decoratorless += module.inputFunction + module.inputRequired
      inputs.decorator += module.inputDecorator

      // Outputs
      outputs.decoratorless += module.outputFunction
      outputs.decorator += module.outputDecorator

      // ViewChild queries
      viewChildQueries.decoratorless += module.viewChildFunction + module.viewChildRequired
      viewChildQueries.decorator += module.viewChildDecorator
      
      // ViewChildren queries
      viewChildrenQueries.decoratorless += module.viewChildrenFunction
      viewChildrenQueries.decorator += module.viewChildrenDecorator
      
      // ContentChild queries
      contentChildQueries.decoratorless += module.contentChildFunction + module.contentChildRequired
      contentChildQueries.decorator += module.contentChildDecorator
      
      // ContentChildren queries
      contentChildrenQueries.decoratorless += module.contentChildrenFunction
      contentChildrenQueries.decorator += module.contentChildrenDecorator
    })
    
    // Calculate percentages
    const calculatePercentage = (decoratorless: number, decorator: number) => {
      const total = decoratorless + decorator
      return total > 0 ? Math.round((decoratorless / total) * 100) : 0
    }

    return [
      {
        name: "Inputs",
        decoratorless: inputs.decoratorless,
        decorator: inputs.decorator,
        total: inputs.decoratorless + inputs.decorator,
        percentage: calculatePercentage(inputs.decoratorless, inputs.decorator)
      },
      {
        name: "Outputs",
        decoratorless: outputs.decoratorless,
        decorator: outputs.decorator,
        total: outputs.decoratorless + outputs.decorator,
        percentage: calculatePercentage(outputs.decoratorless, outputs.decorator)
      },
      {
        name: "ViewChild",
        decoratorless: viewChildQueries.decoratorless,
        decorator: viewChildQueries.decorator,
        total: viewChildQueries.decoratorless + viewChildQueries.decorator,
        percentage: calculatePercentage(viewChildQueries.decoratorless, viewChildQueries.decorator)
      },
      {
        name: "ViewChildren",
        decoratorless: viewChildrenQueries.decoratorless,
        decorator: viewChildrenQueries.decorator,
        total: viewChildrenQueries.decoratorless + viewChildrenQueries.decorator,
        percentage: calculatePercentage(viewChildrenQueries.decoratorless, viewChildrenQueries.decorator)
      },
      {
        name: "ContentChild",
        decoratorless: contentChildQueries.decoratorless,
        decorator: contentChildQueries.decorator,
        total: contentChildQueries.decoratorless + contentChildQueries.decorator,
        percentage: calculatePercentage(contentChildQueries.decoratorless, contentChildQueries.decorator)
      },
      {
        name: "ContentChildren",
        decoratorless: contentChildrenQueries.decoratorless,
        decorator: contentChildrenQueries.decorator,
        total: contentChildrenQueries.decoratorless + contentChildrenQueries.decorator,
        percentage: calculatePercentage(contentChildrenQueries.decoratorless, contentChildrenQueries.decorator)
      }
    ].sort((a, b) => b.total - a.total)
  }

  const chartData = processData()
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-sm text-green-600">Decoratorless: {data.decoratorless}</p>
          <p className="text-sm text-red-600">Decorator: {data.decorator}</p>
          <p className="text-sm font-medium mt-1">{data.percentage}% Migrated</p>
        </div>
      )
    }
    return null
  }

  const getBarFill = (percentage: number) => {
    if (percentage < 20) return "#ef4444" // red-500
    if (percentage < 40) return "#f97316" // orange-500 
    if (percentage < 60) return "#eab308" // yellow-500
    if (percentage < 80) return "#84cc16" // lime-500
    return "#22c55e" // green-500
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={90} 
            tick={{ fontSize: 12 }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => {
              return value === 'percentage' ? 'Migration %' : value.charAt(0).toUpperCase() + value.slice(1)
            }} 
          />
          <Bar 
            dataKey="decorator" 
            stackId="a" 
            fill="#fca5a5" 
            name="Decorator"
          />
          <Bar 
            dataKey="decoratorless" 
            stackId="a" 
            fill="#86efac" 
            name="Decoratorless" 
          />
          <Bar 
            dataKey="percentage" 
            name="percentage" 
            radius={[10, 10, 10, 10]} 
            maxBarSize={10} 
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarFill(entry.percentage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}