"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowUp, ArrowDown, Trophy, Target, Info, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { decoratorlessAPIReports } from "@/lib/data"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

import { DecoratorlessAPITable } from "@/components/decoratorless-api-table"
import { DecoratorlessMigrationProgress } from "@/components/decoratorless-migration-progress"
import { DecoratorlessLeaderboard } from "@/components/decoratorless-leaderboard"
import { DecoratorlessMigrationHeatmap } from "@/components/decoratorless-migration-heatmap"
import { DecoratorlessOverviewChart } from "@/components/decoratorless-overview-chart"
import { DecoratorlessTimelineChart } from "@/components/decoratorless-timeline-chart"
import { DecoratorlessContributorLeaderboard } from "@/components/decoratorless-contributor-leaderboard"

export default function DecoratorlessMigrationDashboard() {
  const [selectedReportIndex, setSelectedReportIndex] = useState(decoratorlessAPIReports.length - 1); // Start with most recent
  const [compareReportIndex, setCompareReportIndex] = useState(0); // Start with first report

  // Get the current reports based on selected indexes
  const currentReport = decoratorlessAPIReports[selectedReportIndex];
  const compareReport = decoratorlessAPIReports[compareReportIndex];

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Validate data before rendering
  const hasDecoratorlessAPI = currentReport && currentReport.decoratorlessAPI;

  // Make reports available globally for the contributor leaderboard
  if (typeof window !== 'undefined') {
    (window as any).decoratorlessAPIReports = decoratorlessAPIReports;
  }

  if (!hasDecoratorlessAPI) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load decoratorless API report data.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const reportDate = formatDate(currentReport.metadata.artemis.commitDate);
  
  // Calculate overall migration progress
  const calculateOverallProgress = (report: typeof currentReport) => {
    let totalDecoratorless = 0;
    let totalDecorators = 0;
    
    Object.values(report.decoratorlessAPI).forEach((module) => {
      // Decoratorless APIs
      totalDecoratorless += 
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
      totalDecorators +=
        module.inputDecorator +
        module.outputDecorator +
        module.viewChildDecorator +
        module.viewChildrenDecorator +
        module.contentChildDecorator;
    });
    
    const total = totalDecoratorless + totalDecorators;
    return total > 0 ? Math.round((totalDecoratorless / total) * 100) : 0;
  };
  
  const currentProgress = calculateOverallProgress(currentReport);
  const compareProgress = calculateOverallProgress(compareReport);
  const progressDifference = currentProgress - compareProgress;
  
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Angular Decoratorless API Migration</h1>
            <p className="text-sm text-slate-500">
              Track your team's progress toward modern Angular APIs
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Migration Progress Report</h2>
              <Badge variant={progressDifference > 0 ? "default" : progressDifference < 0 ? "destructive" : "secondary"} className="ml-2">
                {progressDifference > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : 
                 progressDifference < 0 ? <ArrowDown className="h-3 w-3 mr-1" /> : null}
                {progressDifference > 0 ? `+${progressDifference}%` : progressDifference < 0 ? `${progressDifference}%` : 'No change'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Commit: {currentReport.metadata.artemis.commitHash.substring(0, 8)} • {reportDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="compare-version">Compare with:</Label>
              <Select 
                value={compareReportIndex.toString()} 
                onValueChange={(val) => setCompareReportIndex(parseInt(val))}
              >
                <SelectTrigger id="compare-version" className="w-[240px]">
                  <SelectValue placeholder="Select version to compare" />
                </SelectTrigger>
                <SelectContent>
                  {decoratorlessAPIReports.map((report, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="current-version">Current version:</Label>
              <Select 
                value={selectedReportIndex.toString()} 
                onValueChange={(val) => setSelectedReportIndex(parseInt(val))}
              >
                <SelectTrigger id="current-version" className="w-[240px]">
                  <SelectValue placeholder="Select current version" />
                </SelectTrigger>
                <SelectContent>
                  {decoratorlessAPIReports.map((report, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DecoratorlessMigrationProgress 
            currentReport={currentReport} 
            compareReport={compareReport} 
          />
        </div>

        <div className="mt-6">
          <Tabs defaultValue="competition">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="competition">Module Challenge</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="progress">Timeline Progress</TabsTrigger>
              <TabsTrigger value="heatmap">Migration Heatmap</TabsTrigger>
              <TabsTrigger value="data">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="competition" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <div>
                          <CardTitle>Module Migration Challenge</CardTitle>
                          <CardDescription>Which teams are leading the decoratorless API adoption?</CardDescription>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              This leaderboard ranks modules by the percentage of decoratorless APIs they've adopted.
                              Higher percentages indicate better adoption of modern Angular patterns.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DecoratorlessLeaderboard 
                      currentData={currentReport.decoratorlessAPI} 
                      compareData={compareReport.decoratorlessAPI} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <div>
                        <CardTitle>API Adoption Overview</CardTitle>
                        <CardDescription>Progress for each API type</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DecoratorlessOverviewChart 
                      data={currentReport} 
                      compareData={compareReport}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contributors" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <div>
                        <CardTitle>Contributor Leaderboard</CardTitle>
                        <CardDescription>Who's contributing most to the decoratorless migration?</CardDescription>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This leaderboard shows who's contributing most to the decoratorless migration effort.
                            Contributors are ranked by the number of APIs they've migrated from decorators to modern syntax.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  <DecoratorlessContributorLeaderboard 
                    currentData={currentReport}
                    compareData={compareReport}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Migration Progress Timeline</CardTitle>
                      <CardDescription>Track adoption progress over time</CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This chart shows the trend of decoratorless API adoption over time, 
                            helping you track progress toward migration goals.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  <DecoratorlessTimelineChart 
                    data={decoratorlessAPIReports} 
                    currentIndex={selectedReportIndex} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="heatmap" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Migration Focus Areas</CardTitle>
                      <CardDescription>Identify which areas need the most attention</CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This heatmap shows which modules and API types need the most attention for migration.
                            Red indicates low migration progress, green indicates high progress.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  <DecoratorlessMigrationHeatmap 
                    data={currentReport} 
                    compareData={compareReport} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Raw Migration Data</CardTitle>
                      <CardDescription>Detailed statistics for each module</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DecoratorlessAPITable data={currentReport.decoratorlessAPI} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}