"use client"

import { useState } from "react"
import type { DecoratorlessAPIReport } from "../../report/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DecoratorlessMigrationHeatmapProps {
  data: DecoratorlessAPIReport;
  compareData: DecoratorlessAPIReport;
}

type SortBy = 'alphabetical' | 'total' | 'progress'

export function DecoratorlessMigrationHeatmap({ data, compareData }: DecoratorlessMigrationHeatmapProps) {
  const [sortBy, setSortBy] = useState<SortBy>('progress')

  // Process data for the heatmap
  const processData = () => {
    const currentAPI = data.decoratorlessAPI;
    const compareAPI = compareData.decoratorlessAPI;

    // Helper to get all modules from both reports
    const allModules = new Set([
      ...Object.keys(currentAPI),
      ...Object.keys(compareAPI)
    ]);

    // Include all modules, even those with no usage
    const activeModules = Array.from(allModules).map(moduleName => {
      const module = currentAPI[moduleName] || {
        inputFunction: 0, inputRequired: 0, inputDecorator: 0,
        outputFunction: 0, outputDecorator: 0,
        modelFunction: 0,
        viewChildFunction: 0, viewChildRequired: 0, viewChildDecorator: 0,
        viewChildrenFunction: 0, viewChildrenDecorator: 0,
        contentChildFunction: 0, contentChildRequired: 0, contentChildrenFunction: 0,
        contentChildDecorator: 0,
        total: 0
      };
      
      // Calculate current decoratorless and decorator counts for each API type
      const currentInputDecoratorless = module.inputFunction + module.inputRequired;
      const currentInputDecorators = module.inputDecorator;
      
      const currentOutputDecoratorless = module.outputFunction;
      const currentOutputDecorators = module.outputDecorator;
      
      const currentViewChildDecoratorless = module.viewChildFunction + module.viewChildRequired;
      const currentViewChildDecorators = module.viewChildDecorator;
      
      const currentViewChildrenDecoratorless = module.viewChildrenFunction;
      const currentViewChildrenDecorators = module.viewChildrenDecorator;
      
      const currentContentChildDecoratorless = module.contentChildFunction + module.contentChildRequired;
      const currentContentChildDecorators = module.contentChildDecorator;
      
      // Calculate total APIs for each type
      const inputTotal = currentInputDecoratorless + currentInputDecorators;
      const outputTotal = currentOutputDecoratorless + currentOutputDecorators;
      const viewChildTotal = currentViewChildDecoratorless + currentViewChildDecorators;
      const viewChildrenTotal = currentViewChildrenDecoratorless + currentViewChildrenDecorators;
      const contentChildTotal = currentContentChildDecoratorless + currentContentChildDecorators;

      // Calculate percentages based on the decoratorless APIs
      const inputPercentage = inputTotal > 0 
        ? (currentInputDecoratorless / inputTotal) * 100 
        : 0;
        
      const outputPercentage = outputTotal > 0 
        ? (currentOutputDecoratorless / outputTotal) * 100 
        : 0;
        
      const viewChildPercentage = viewChildTotal > 0 
        ? (currentViewChildDecoratorless / viewChildTotal) * 100 
        : 0;
        
      const viewChildrenPercentage = viewChildrenTotal > 0 
        ? (currentViewChildrenDecoratorless / viewChildrenTotal) * 100 
        : 0;
        
      const contentChildPercentage = contentChildTotal > 0 
        ? (currentContentChildDecoratorless / contentChildTotal) * 100 
        : 0;

      // Calculate overall stats
      const currentTotalDecoratorless = 
        currentInputDecoratorless +
        currentOutputDecoratorless +
        module.modelFunction +
        currentViewChildDecoratorless +
        currentViewChildrenDecoratorless +
        currentContentChildDecoratorless;
        
      const currentTotalDecorators = 
        currentInputDecorators +
        currentOutputDecorators +
        currentViewChildDecorators +
        currentViewChildrenDecorators +
        currentContentChildDecorators;
      
      const totalAPIs = currentTotalDecoratorless + currentTotalDecorators;

      // Calculate overall percentage
      const overallPercentage = totalAPIs > 0 
        ? (currentTotalDecoratorless / totalAPIs) * 100 
        : 0;
      
      return {
        name: moduleName,
        total: totalAPIs,
        overallPercentage: Math.round(overallPercentage * 10) / 10,
        changePercentage: Math.round(overallPercentage * 10) / 10,
        inputs: {
          total: inputTotal,
          percentage: Math.round(inputPercentage * 10) / 10,
          decorators: currentInputDecorators,
          decoratorless: currentInputDecoratorless
        },
        outputs: {
          total: outputTotal,
          percentage: Math.round(outputPercentage * 10) / 10,
          decorators: currentOutputDecorators,
          decoratorless: currentOutputDecoratorless
        },
        viewChild: {
          total: viewChildTotal,
          percentage: Math.round(viewChildPercentage * 10) / 10,
          decorators: currentViewChildDecorators,
          decoratorless: currentViewChildDecoratorless
        },
        viewChildren: {
          total: viewChildrenTotal,
          percentage: Math.round(viewChildrenPercentage * 10) / 10,
          decorators: currentViewChildrenDecorators,
          decoratorless: currentViewChildrenDecoratorless
        },
        contentChild: {
          total: contentChildTotal,
          percentage: Math.round(contentChildPercentage * 10) / 10,
          decorators: currentContentChildDecorators,
          decoratorless: currentContentChildDecoratorless
        }
      }
    });

    // Sort based on selected criteria
    if (sortBy === 'alphabetical') {
      activeModules.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'total') {
      activeModules.sort((a, b) => b.total - a.total)
    } else if (sortBy === 'progress') {
      activeModules.sort((a, b) => b.overallPercentage - a.overallPercentage)
    }

    return activeModules
  }

  const getColorClass = (percentage: number, total: number) => {
    if (total === 0) return "bg-gray-300" // If there are no APIs to migrate, mark as gray
    if (percentage === 0) return "bg-red-500" // 0% progress should be red
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
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((module, index) => (
              <tr key={module.name} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="p-2 font-medium border-t border-slate-200 whitespace-nowrap">{module.name}</td>
                <td className="p-2 border-t border-slate-200">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-full h-6 ${getColorClass(module.inputs.percentage, module.inputs.total)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
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
                      className={`w-full h-6 ${getColorClass(module.outputs.percentage, module.outputs.total)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
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
                      className={`w-full h-6 ${getColorClass(module.viewChild.percentage, module.viewChild.total)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
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
                      className={`w-full h-6 ${getColorClass(module.viewChildren.percentage, module.viewChildren.total)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
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
                      className={`w-full h-6 ${getColorClass(module.contentChild.percentage, module.contentChild.total)} rounded-sm flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {module.contentChild.percentage}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {module.contentChild.decoratorless}/{module.contentChild.total}
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