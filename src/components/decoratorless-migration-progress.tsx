"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Minus, Trophy } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface MigrationProgressProps {
  currentReport: DecoratorlessAPIReport
  compareReport: DecoratorlessAPIReport  // Change from firstReport to compareReport
}

export function DecoratorlessMigrationProgress({ currentReport, compareReport }: MigrationProgressProps) {
  // Calculate summary statistics
  const calculateStats = () => {
    const current = currentReport.decoratorlessAPI
    const compare = compareReport.decoratorlessAPI  // Renamed from "first" to "compare"

    // Aggregate data across all modules
    const currentStats = {
      decoratorless: 0,
      decorator: 0,
      total: 0,
      moduleCount: Object.keys(current).length,
      completedModules: 0
    }

    const compareStats = {  // Renamed from "firstStats" to "compareStats"
      decoratorless: 0,
      decorator: 0,
      total: 0,
    }

    // Helper to get all modules from both reports
    const allModules = new Set([
      ...Object.keys(current),
      ...Object.keys(compare)
    ]);

    // Process current report
    Array.from(allModules).forEach((moduleName) => {
      // Get module data or default to empty values if module doesn't exist
      const module = current[moduleName] || {
        inputFunction: 0, inputRequired: 0, inputDecorator: 0,
        outputFunction: 0, outputDecorator: 0,
        modelFunction: 0,
        viewChildFunction: 0, viewChildRequired: 0, viewChildDecorator: 0,
        viewChildrenFunction: 0, viewChildrenDecorator: 0,
        contentChildFunction: 0, contentChildRequired: 0, contentChildrenFunction: 0,
        contentChildDecorator: 0,
        total: 0
      };
      
      // Decoratorless APIs
      const moduleDecoratorless = 
        module.inputFunction +
        module.inputRequired +
        module.outputFunction +
        module.modelFunction +
        module.viewChildFunction +
        module.viewChildRequired +
        module.viewChildrenFunction +
        module.contentChildFunction +
        module.contentChildRequired +
        module.contentChildrenFunction;
      
      // Decorator APIs
      const moduleDecorator =
        module.inputDecorator +
        module.outputDecorator +
        module.viewChildDecorator +
        module.viewChildrenDecorator +
        module.contentChildDecorator;
        
      currentStats.decoratorless += moduleDecoratorless;
      currentStats.decorator += moduleDecorator;
      
      // Calculate if module is "completed" (100% decoratorless)
      const moduleTotal = moduleDecoratorless + moduleDecorator;
      if (moduleTotal === 0 || moduleDecoratorless / moduleTotal === 1) {
        currentStats.completedModules++;
      }
      
      // Get module data from comparison report
      const compareModule = compare[moduleName] || {
        inputFunction: 0, inputRequired: 0, inputDecorator: 0,
        outputFunction: 0, outputDecorator: 0,
        modelFunction: 0,
        viewChildFunction: 0, viewChildRequired: 0, viewChildDecorator: 0,
        viewChildrenFunction: 0, viewChildrenDecorator: 0,
        contentChildFunction: 0, contentChildRequired: 0, contentChildrenFunction: 0,
        contentChildDecorator: 0,
        total: 0
      };
      
      // Decoratorless APIs in comparison report
      compareStats.decoratorless +=
        compareModule.inputFunction +
        compareModule.inputRequired +
        compareModule.outputFunction +
        compareModule.modelFunction +
        compareModule.viewChildFunction +
        compareModule.viewChildRequired +
        compareModule.viewChildrenFunction +
        compareModule.contentChildFunction +
        compareModule.contentChildRequired +
        compareModule.contentChildrenFunction;

      // Decorator APIs in comparison report
      compareStats.decorator +=
        compareModule.inputDecorator +
        compareModule.outputDecorator +
        compareModule.viewChildDecorator +
        compareModule.viewChildrenDecorator +
        compareModule.contentChildDecorator;
    })

    currentStats.total = currentStats.decoratorless + currentStats.decorator
    compareStats.total = compareStats.decoratorless + compareStats.decorator

    // Calculate percentages and changes
    const currentPercentage = currentStats.total > 0 ? (currentStats.decoratorless / currentStats.total) * 100 : 100
    const comparePercentage = compareStats.total > 0 ? (compareStats.decoratorless / compareStats.total) * 100 : 100
    const percentageChange = currentPercentage - comparePercentage
    
    // Calculate how many API usages still need migration
    const remaining = currentStats.decorator;
    
    // Calculate completion percentage for modules
    const moduleCompletionPercentage = (currentStats.completedModules / currentStats.moduleCount) * 100;

    return {
      currentStats,
      compareStats,  // Renamed from firstStats
      currentPercentage: Math.round(currentPercentage * 10) / 10,
      comparePercentage: Math.round(comparePercentage * 10) / 10,  // Renamed from firstPercentage
      percentageChange: Math.round(percentageChange * 10) / 10,
      decoratorlessChange: currentStats.decoratorless - compareStats.decoratorless,
      decoratorChange: currentStats.decorator - compareStats.decorator,
      remaining,
      moduleCompletionPercentage: Math.round(moduleCompletionPercentage)
    }
  }

  const stats = calculateStats()

  return (
    <>
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          <CardDescription>Decoratorless API adoption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.currentPercentage}%</div>
          <div className="mt-1 flex items-center text-xs">
            {stats.percentageChange > 0 ? (
              <>
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500">+{stats.percentageChange}%</span>
              </>
            ) : stats.percentageChange < 0 ? (
              <>
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                <span className="text-red-500">{stats.percentageChange}%</span>
              </>
            ) : (
              <>
                <Minus className="mr-1 h-4 w-4 text-slate-500" />
                <span className="text-slate-500">No change</span>
              </>
            )}
            <span className="ml-1 text-slate-500">since comparison report</span>
          </div>
          <div className="mt-4">
            <Progress value={stats.currentPercentage} className="h-2" />
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Goal: 100% Decoratorless APIs
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">Module Completion</CardTitle>
          </div>
          <CardDescription>Modules with 100% decoratorless APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.currentStats.completedModules} / {stats.currentStats.moduleCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.moduleCompletionPercentage}% of modules completed
          </div>
          <div className="mt-4">
            <Progress value={stats.moduleCompletionPercentage} className="h-2" />
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Goal: All modules using decoratorless APIs
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Remaining Work</CardTitle>
          <CardDescription>Decorator APIs still to migrate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.remaining}</div>
          <div className="mt-1 flex items-center text-xs">
            {stats.decoratorChange < 0 ? (
              <>
                <ArrowDownRight className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500">{stats.decoratorChange}</span>
              </>
            ) : stats.decoratorChange > 0 ? (
              <>
                <ArrowUpRight className="mr-1 h-4 w-4 text-red-500" />
                <span className="text-red-500">+{stats.decoratorChange}</span>
              </>
            ) : (
              <>
                <Minus className="mr-1 h-4 w-4 text-slate-500" />
                <span className="text-slate-500">No change</span>
              </>
            )}
            <span className="ml-1 text-slate-500">since comparison report</span>
          </div>
          <div className="mt-4">
            <Progress 
              value={stats.currentStats.decoratorless > 0 ? 
                Math.round((stats.currentStats.decoratorless / (stats.currentStats.decoratorless + stats.remaining)) * 100) : 0
              } 
              className="h-2" 
            />
            <div className="mt-3 text-xs text-slate-500">
              {stats.currentStats.decoratorless > 0 ? 
                `${Math.round((stats.currentStats.decoratorless / (stats.currentStats.decoratorless + stats.remaining)) * 100)}% Complete` : 
                'No migration started'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}