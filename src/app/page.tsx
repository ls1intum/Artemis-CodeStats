"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComponentInventoryTable } from "@/components/component-inventory-table"
import { ChangeDetectionTable } from "@/components/change-detection-table"
import { ComponentInventoryChart } from "@/components/component-inventory-chart"
import { ChangeDetectionChart } from "@/components/change-detection-chart"
import { TotalComponentsChart } from "@/components/total-components-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Trophy } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { changeDetectionReports, componentInventoryReports, decoratorlessAPIReports } from "@/lib/data"
import { DecoratorlessAPITable } from "@/components/decoratorless-api-table"
import { Button } from "@/components/ui/button"


export default function AngularDebtDashboard() {
  // State to track which report version is selected for each report type
  const [selectedComponentInventoryIndex, setSelectedComponentInventoryIndex] = useState(0);
  const [selectedChangeDetectionIndex, setSelectedChangeDetectionIndex] = useState(0);
  const [selectedDecoratorlessAPIIndex, setSelectedDecoratorlessAPIIndex] = useState(0);

  // Get the current reports based on selected indexes
  const currentComponentInventoryReport = componentInventoryReports[selectedComponentInventoryIndex];
  const currentChangeDetectionReport = changeDetectionReports[selectedChangeDetectionIndex];
  const currentDecoratorlessAPIReport = decoratorlessAPIReports[selectedDecoratorlessAPIIndex];

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
  const hasComponentInventory = currentComponentInventoryReport && currentComponentInventoryReport.componentInventory;
  const hasChangeDetection = currentChangeDetectionReport && currentChangeDetectionReport.changeDetection;
  const hasDecoratorlessAPI = currentDecoratorlessAPIReport && currentDecoratorlessAPIReport.decoratorlessAPI;

  if (!hasComponentInventory || !hasChangeDetection) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load report data. Please check that the data format is correct.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Angular Technical Debt Analysis
        </h1>
        <p className="text-muted-foreground mt-2">
          Reports available from multiple commits
        </p>
      </div>

      {hasDecoratorlessAPI && (
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Decoratorless API Migration Challenge</h3>
                    <p className="text-slate-600">Track your team's progress in migrating to modern Angular APIs</p>
                  </div>
                </div>
                <a href="/decoratorless">
                  <Button className="gap-2">
                    Go to Migration Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="tables" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Component Inventory</CardTitle>
                  <CardDescription>Breakdown of Angular artifacts across different modules</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="component-version">Version:</Label>
                  <Select 
                    value={selectedComponentInventoryIndex.toString()} 
                    onValueChange={(val) => setSelectedComponentInventoryIndex(parseInt(val))}
                  >
                    <SelectTrigger id="component-version" className="w-[240px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {componentInventoryReports.map((report, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ComponentInventoryTable data={currentComponentInventoryReport.componentInventory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Change Detection Strategies</CardTitle>
                  <CardDescription>Analysis of change detection strategies used across modules</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="change-detection-version">Version:</Label>
                  <Select 
                    value={selectedChangeDetectionIndex.toString()} 
                    onValueChange={(val) => setSelectedChangeDetectionIndex(parseInt(val))}
                  >
                    <SelectTrigger id="change-detection-version" className="w-[240px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {changeDetectionReports.map((report, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChangeDetectionTable data={currentChangeDetectionReport.changeDetection} />
            </CardContent>
          </Card>

          {hasDecoratorlessAPI && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Decoratorless API Usage</CardTitle>
                    <CardDescription>Analysis of modern Angular APIs without decorators</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <a href="/decoratorless">
                      <Button variant="outline" size="sm" className="gap-2">
                        Detailed Dashboard
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </a>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="decoratorless-api-version">Version:</Label>
                      <Select 
                        value={selectedDecoratorlessAPIIndex.toString()} 
                        onValueChange={(val) => setSelectedDecoratorlessAPIIndex(parseInt(val))}
                      >
                        <SelectTrigger id="decoratorless-api-version" className="w-[240px]">
                          <SelectValue placeholder="Select version" />
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
              </CardHeader>
              <CardContent>
                <DecoratorlessAPITable data={currentDecoratorlessAPIReport.decoratorlessAPI} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Total Components by Module</CardTitle>
                    <CardDescription>Modules sorted by total number of components</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="component-chart-version">Version:</Label>
                    <Select 
                      value={selectedComponentInventoryIndex.toString()} 
                      onValueChange={(val) => setSelectedComponentInventoryIndex(parseInt(val))}
                    >
                      <SelectTrigger id="component-chart-version" className="w-[240px]">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentInventoryReports.map((report, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <TotalComponentsChart data={currentComponentInventoryReport.componentInventory} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Component Inventory Breakdown</CardTitle>
                    <CardDescription>Distribution of components, directives, pipes, and injectables</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="inventory-breakdown-version">Version:</Label>
                    <Select 
                      value={selectedComponentInventoryIndex.toString()} 
                      onValueChange={(val) => setSelectedComponentInventoryIndex(parseInt(val))}
                    >
                      <SelectTrigger id="inventory-breakdown-version" className="w-[240px]">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentInventoryReports.map((report, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ComponentInventoryChart data={currentComponentInventoryReport.componentInventory} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Change Detection Strategies</CardTitle>
                  <CardDescription>OnPush vs Implicit change detection by module</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="change-detection-chart-version">Version:</Label>
                  <Select 
                    value={selectedChangeDetectionIndex.toString()} 
                    onValueChange={(val) => setSelectedChangeDetectionIndex(parseInt(val))}
                  >
                    <SelectTrigger id="change-detection-chart-version" className="w-[240px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {changeDetectionReports.map((report, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {formatDate(report.metadata.artemis.commitDate)} - {report.metadata.artemis.commitHash.substring(0, 7)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChangeDetectionChart data={currentChangeDetectionReport.changeDetection} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
