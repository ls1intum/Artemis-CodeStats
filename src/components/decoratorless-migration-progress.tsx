"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Minus, Trophy } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface MigrationProgressProps {
  currentReport: DecoratorlessAPIReport
  firstReport: DecoratorlessAPIReport
}

export function DecoratorlessMigrationProgress({ currentReport, firstReport }: MigrationProgressProps) {
  // Calculate summary statistics
  const calculateStats = () => {
    const current = currentReport.decoratorlessAPI
    const first = firstReport.decoratorlessAPI

    // Aggregate data across all modules
    const currentStats = {
      decoratorless: 0,
      decorator: 0,
      total: 0,
      moduleCount: Object.keys(current).length,
      completedModules: 0 // Modules with >90% decoratorless
    }

    const firstStats = {
      decoratorless: 0,
      decorator: 0,
      total: 0,
    }

    // Process current report
    Object.values(current).forEach((module) => {
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
      
      // Calculate if module is "completed" (>90% decoratorless)
      const moduleTotal = moduleDecoratorless + moduleDecorator;
      if (moduleTotal > 0 && (moduleDecoratorless / moduleTotal > 0.9)) {
        currentStats.completedModules++;
      }
    })

    currentStats.total = currentStats.decoratorless + currentStats.decorator

    // Process first report
    Object.values(first).forEach((module) => {
      // Decoratorless APIs
      firstStats.decoratorless +=
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
      firstStats.decorator +=
        module.inputDecorator +
        module.outputDecorator +
        module.viewChildDecorator +
        module.viewChildrenDecorator +
        module.contentChildDecorator;
    })

    firstStats.total = firstStats.decoratorless + firstStats.decorator

    // Calculate percentages and changes
    const currentPercentage = currentStats.total > 0 ? (currentStats.decoratorless / currentStats.total) * 100 : 0

    const firstPercentage = firstStats.total > 0 ? (firstStats.decoratorless / firstStats.total) * 100 : 0

    const percentageChange = currentPercentage - firstPercentage
    
    // Calculate how many API usages still need migration
    const remaining = currentStats.decorator;
    
    // Calculate completion percentage for modules
    const moduleCompletionPercentage = (currentStats.completedModules / currentStats.moduleCount) * 100;

    return {
      currentStats,
      firstStats,
      currentPercentage: Math.round(currentPercentage * 10) / 10,
      firstPercentage: Math.round(firstPercentage * 10) / 10,
      percentageChange: Math.round(percentageChange * 10) / 10,
      decoratorlessChange: currentStats.decoratorless - firstStats.decoratorless,
      decoratorChange: currentStats.decorator - firstStats.decorator,
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
            <span className="ml-1 text-slate-500">since first report</span>
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
          <CardDescription>Modules with &gt;90% decoratorless APIs</CardDescription>
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
            <span className="ml-1 text-slate-500">since first report</span>
          </div>
          <div className="mt-4 h-10 flex items-center">
            <div className="bg-slate-100 w-full p-2 rounded-md text-center text-sm font-medium">
              {stats.currentStats.decoratorless > 0 ? (
                `${Math.round((stats.currentStats.decoratorless / (stats.currentStats.decoratorless + stats.remaining)) * 100)}% Complete`
              ) : (
                'No migration started'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}