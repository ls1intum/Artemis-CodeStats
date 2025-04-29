"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"

interface DecoratorlessTimelineChartProps {
  data: DecoratorlessAPIReport[]
  currentIndex: number
}

export function DecoratorlessTimelineChart({ data, currentIndex }: DecoratorlessTimelineChartProps) {
  // Process data for the chart
  const processData = () => {
    // We'll show all the data up to the current index
    const relevantData = [...data].sort((a, b) => 
      a.metadata.artemis.commitDate.getTime() - b.metadata.artemis.commitDate.getTime()
    )

    return relevantData.map((report, index) => {
      const decoratorlessAPI = report.decoratorlessAPI

      // Aggregate data across all modules
      let decoratorlessCount = 0
      let decoratorCount = 0
      
      // Track decorator types separately
      const apiCounts = {
        inputs: { decoratorless: 0, decorator: 0 },
        outputs: { decoratorless: 0, decorator: 0 },
        queries: { decoratorless: 0, decorator: 0 }
      }

      Object.values(decoratorlessAPI).forEach((module) => {
        // Inputs
        apiCounts.inputs.decoratorless += module.inputFunction + module.inputRequired
        apiCounts.inputs.decorator += module.inputDecorator
        
        // Outputs
        apiCounts.outputs.decoratorless += module.outputFunction
        apiCounts.outputs.decorator += module.outputDecorator
        
        // Queries (ViewChild, ViewChildren, ContentChild, ContentChildren)
        apiCounts.queries.decoratorless +=
          module.viewChildFunction +
          module.viewChildRequired +
          module.viewChildrenFunction +
          module.contentChildFunction +
          module.contentChildRequired +
          module.contentChildrenFunction

        apiCounts.queries.decorator +=
          module.viewChildDecorator +
          module.viewChildrenDecorator +
          module.contentChildDecorator
          
        // Total decoratorless APIs
        decoratorlessCount +=
          module.inputFunction +
          module.inputRequired +
          module.outputFunction +
          module.modelFunction +
          module.viewChildFunction +
          module.viewChildRequired +
          module.viewChildrenFunction +
          module.contentChildFunction +
          module.contentChildRequired +
          module.contentChildrenFunction

        // Total decorator APIs
        decoratorCount +=
          module.inputDecorator +
          module.outputDecorator +
          module.viewChildDecorator +
          module.viewChildrenDecorator +
          module.contentChildDecorator
      })

      const total = decoratorlessCount + decoratorCount
      const percentageDecoratorless = total > 0 ? (decoratorlessCount / total) * 100 : 0
      
      // Calculate percentages for each API type
      const calculatePercentage = (decoratorless: number, decorator: number) => {
        const total = decoratorless + decorator
        return total > 0 ? (decoratorless / total) * 100 : 0
      }
      
      const inputsPercentage = calculatePercentage(apiCounts.inputs.decoratorless, apiCounts.inputs.decorator)
      const outputsPercentage = calculatePercentage(apiCounts.outputs.decoratorless, apiCounts.outputs.decorator)
      const queriesPercentage = calculatePercentage(apiCounts.queries.decoratorless, apiCounts.queries.decorator)

      // Format date for display
      const date = report.metadata.artemis.commitDate
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`

      return {
        date: formattedDate,
        fullDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        commitHash: report.metadata.artemis.commitHash.substring(0, 8),
        decoratorless: decoratorlessCount,
        decorator: decoratorCount,
        total,
        percentageDecoratorless: Math.round(percentageDecoratorless * 10) / 10,
        inputsPercentage: Math.round(inputsPercentage * 10) / 10,
        outputsPercentage: Math.round(outputsPercentage * 10) / 10,
        queriesPercentage: Math.round(queriesPercentage * 10) / 10,
        isCurrent: index === currentIndex
      }
    })
  }

  const chartData = processData()
  
  // Find the current data point to highlight
  const currentDataPoint = chartData.find(d => d.commitHash === data[currentIndex].metadata.artemis.commitHash.substring(0, 8))
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
          <p className="font-medium text-slate-900">{data.fullDate}</p>
          <p className="text-xs text-slate-500">Commit: {data.commitHash}</p>
          <div className="mt-2">
            <p className="text-sm"><span className="font-medium">Overall:</span> {data.percentageDecoratorless}% decoratorless</p>
            <p className="text-sm"><span className="font-medium">Inputs:</span> {data.inputsPercentage}%</p>
            <p className="text-sm"><span className="font-medium">Outputs:</span> {data.outputsPercentage}%</p>
            <p className="text-sm"><span className="font-medium">Queries:</span> {data.queriesPercentage}%</p>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 text-xs">
            <p><span className="font-medium">Decoratorless:</span> {data.decoratorless}</p>
            <p><span className="font-medium">Decorator:</span> {data.decorator}</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value, index) => (index % Math.max(1, Math.floor(chartData.length / 10)) === 0 ? value : "")}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis yAxisId="left" orientation="left" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          
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
                fontSize: 12
              }} 
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                'percentageDecoratorless': 'Overall %',
                'inputsPercentage': 'Inputs %',
                'outputsPercentage': 'Outputs %',
                'queriesPercentage': 'Queries %',
                'decoratorless': 'Decoratorless Count',
                'decorator': 'Decorator Count'
              }
              return labels[value] || value
            }}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="percentageDecoratorless"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ r: 1 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="inputsPercentage"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            strokeDasharray="3 3"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="outputsPercentage"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            strokeDasharray="3 3"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="queriesPercentage"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            strokeDasharray="3 3"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="decoratorless"
            stroke="#86efac"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="decorator"
            stroke="#fca5a5"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}