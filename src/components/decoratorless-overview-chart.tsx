"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, LabelList } from "recharts"

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
      }
    ].sort((a, b) => b.total - a.total)
  }

  const chartData = processData()
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<any>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-sm text-green-500">Decoratorless: {data.decoratorless}</p>
          <p className="text-sm text-red-500">Decorator: {data.decorator}</p>
          <p className="text-sm font-medium mt-1">{data.percentage}% Migrated</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 50, left: 10, bottom: 20 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} />
          <XAxis 
            type="number" 
            domain={[0, 100]} 
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={90} 
            tick={{ fontSize: 12 }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="percentage" 
            fill="var(--chart-2)" 
            name="Migration %" 
          >
            <LabelList 
              dataKey="percentage" 
              position="right" 
              formatter={(value: number) => `${value}%`}
              style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}