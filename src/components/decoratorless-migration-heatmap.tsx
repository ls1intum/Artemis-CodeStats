"use client"

import { useState } from "react"
import type { DecoratorlessAPIReport } from "../../report/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DecoratorlessMigrationHeatmapProps {
  data: DecoratorlessAPIReport
}

type SortBy = 'alphabetical' | 'total' | 'progress'

export function DecoratorlessMigrationHeatmap({ data }: DecoratorlessMigrationHeatmapProps) {
  const [sortBy, setSortBy] = useState<SortBy>('progress')

  // Process data for the heatmap
  const processData = () => {
    const decoratorlessAPI = data.decoratorlessAPI

    // Filter out modules with no usage
    const activeModules = Object.entries(decoratorlessAPI)
      .filter(([_, stats]) => stats.total > 0)
      .map(([moduleName, stats]) => {
        // Calculate percentages for each API type
        const inputTotal = stats.inputFunction + stats.inputRequired + stats.inputDecorator
        const inputPercentage = inputTotal > 0 ? ((stats.inputFunction + stats.inputRequired) / inputTotal) * 100 : 0

        const outputTotal = stats.outputFunction + stats.outputDecorator
        const outputPercentage = outputTotal > 0 ? (stats.outputFunction / outputTotal) * 100 : 0

        const viewChildTotal = stats.viewChildFunction + stats.viewChildRequired + stats.viewChildDecorator
        const viewChildPercentage =
          viewChildTotal > 0 ? ((stats.viewChildFunction + stats.viewChildRequired) / viewChildTotal) * 100 : 0

        const viewChildrenTotal = stats.viewChildrenFunction + stats.viewChildrenDecorator
        const viewChildrenPercentage =
          viewChildrenTotal > 0 ? (stats.viewChildrenFunction / viewChildrenTotal) * 100 : 0

        const contentChildTotal = stats.contentChildFunction + stats.contentChildRequired + stats.contentChildDecorator
        const contentChildPercentage =
          contentChildTotal > 0
            ? ((stats.contentChildFunction + stats.contentChildRequired) / contentChildTotal) * 100
            : 0

        const contentChildrenTotal = stats.contentChildrenFunction + stats.contentChildrenDecorator
        const contentChildrenPercentage =
          contentChildrenTotal > 0 ? (stats.contentChildrenFunction / contentChildrenTotal) * 100 : 0
          
        // Calculate overall percentage
        const totalDecoratorless = 
          stats.inputFunction +
          stats.inputRequired +
          stats.outputFunction +
          stats.modelFunction +
          stats.viewChildFunction +
          stats.viewChildRequired +
          stats.viewChildrenFunction +
          stats.contentChildFunction +
          stats.contentChildRequired +
          stats.contentChildrenFunction
          
        const overallPercentage = stats.total > 0 ? (totalDecoratorless / stats.total) * 100 : 0

        return {
          name: moduleName,
          total: stats.total,
          overallPercentage: Math.round(overallPercentage * 10) / 10,
          inputs: {
            total: inputTotal,
            percentage: Math.round(inputPercentage * 10) / 10,
            decorator: stats.inputDecorator,
            decoratorless: stats.inputFunction + stats.inputRequired,
          },
          outputs: {
            total: outputTotal,
            percentage: Math.round(outputPercentage * 10) / 10,
            decorator: stats.outputDecorator,
            decoratorless: stats.outputFunction,
          },
          viewChild: {
            total: viewChildTotal,
            percentage: Math.round(viewChildPercentage * 10) / 10,
            decorator: stats.viewChildDecorator,
            decoratorless: stats.viewChildFunction + stats.viewChildRequired,
          },
          viewChildren: {
            total: viewChildrenTotal,
            percentage: Math.round(viewChildrenPercentage * 10) / 10,
            decorator: stats.viewChildrenDecorator,
            decoratorless: stats.viewChildrenFunction,
          },
          contentChild: {
            total: contentChildTotal,
            percentage: Math.round(contentChildPercentage * 10) / 10,
            decorator: stats.contentChildDecorator,
            decoratorless: stats.contentChildFunction + stats.contentChildRequired,
          },
          contentChildren: {
            total: contentChildrenTotal,
            percentage: Math.round(contentChildrenPercentage * 10) / 10,
            decorator: stats.contentChildrenDecorator,
            decoratorless: stats.contentChildrenFunction,
          },
        }
      })

    // Sort based on selected criteria
    if (sortBy === 'alphabetical') {
      activeModules.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'total') {
      activeModules.sort((a, b) => b.total - a.total)
    } else if (sortBy === 'progress') {
      activeModules.sort((a, b) => b.overallPercentage - a.overallPercentage)
    }

    // Take top 12 modules
    return activeModules.slice(0, 12)
  }

  const getColorClass = (percentage: number) => {
    if (percentage === 0) return "bg-slate-200"
    if (percentage < 20) return "bg-red-500"
    if (percentage < 40) return "bg-orange-500"
    if (percentage < 60) return "bg-yellow-500"
    if (percentage < 80) return "bg-lime-500"
    return "bg-green-500"
  }

  const heatmapData = processData()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select 
          value={sortBy} 
          onValueChange={(value) => setSortBy(value as SortBy)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort modules by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">Sort by Progress</SelectItem>
            <SelectItem value="total">Sort by API Count</SelectItem>
            <SelectItem value="alphabetical">Sort Alphabetically</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left font-medium text-slate-700">Module</th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>Inputs</div>
                <div className="text-xs font-normal text-slate-500">@Input() → input()</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>Outputs</div>
                <div className="text-xs font-normal text-slate-500">@Output() → output()</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>ViewChild</div>
                <div className="text-xs font-normal text-slate-500">@ViewChild() → viewChild()</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>ViewChildren</div>
                <div className="text-xs font-normal text-slate-500">@ViewChildren() → viewChildren()</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>ContentChild</div>
                <div className="text-xs font-normal text-slate-500">@ContentChild() → contentChild()</div>
              </th>
              <th className="p-2 text-center font-medium text-slate-700">
                <div>ContentChildren</div>
                <div className="text-xs font-normal text-slate-500">@ContentChildren() → contentChildren()</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((module, index) => (
              <tr key={module.name} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="p-2 font-medium border-t border-slate-200 whitespace-nowrap">{module.name}</td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.inputs.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.inputs.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.inputs.decoratorless}/{module.inputs.total}
                    </div>
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.outputs.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.outputs.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.outputs.decoratorless}/{module.outputs.total}
                    </div>
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.viewChild.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.viewChild.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.viewChild.decoratorless}/{module.viewChild.total}
                    </div>
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.viewChildren.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.viewChildren.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.viewChildren.decoratorless}/{module.viewChildren.total}
                    </div>
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.contentChild.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.contentChild.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.contentChild.decoratorless}/{module.contentChild.total}
                    </div>
                  </div>
                </td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.contentChildren.percentage)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.contentChildren.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.contentChildren.decoratorless}/{module.contentChildren.total}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="text-xs text-slate-500">Migration Progress:</div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            <div className="text-xs">0-20%</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
            <div className="text-xs">20-40%</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
            <div className="text-xs">40-60%</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-lime-500 rounded-sm"></div>
            <div className="text-xs">60-80%</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <div className="text-xs">80-100%</div>
          </div>
        </div>
      </div>
    </div>
  )
}