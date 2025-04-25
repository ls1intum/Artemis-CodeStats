"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComponentInventoryTable } from "@/components/component-inventory-table"
import { ChangeDetectionTable } from "@/components/change-detection-table"
import { ComponentInventoryChart } from "@/components/component-inventory-chart"
import { ChangeDetectionChart } from "@/components/change-detection-chart"
import { TotalComponentsChart } from "@/components/total-components-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import reportData from "@/lib/data"


export default function AngularDebtDashboard() {
  const currentReport = reportData[0];

  // Validate data before rendering
  if (!currentReport || !currentReport.componentInventory || !currentReport.changeDetection) {
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
          {currentReport.metadata?.title || "Angular Technical Debt Analysis"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Generated on:{" "}
          {currentReport.metadata?.generatedAt ? new Date(currentReport.metadata.generatedAt).toLocaleString() : "N/A"}
        </p>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="tables" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Inventory</CardTitle>
              <CardDescription>Breakdown of Angular artifacts across different modules</CardDescription>
            </CardHeader>
            <CardContent>
              <ComponentInventoryTable data={currentReport.componentInventory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Detection Strategies</CardTitle>
              <CardDescription>Analysis of change detection strategies used across modules</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeDetectionTable data={currentReport.changeDetection} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Components by Module</CardTitle>
                <CardDescription>Modules sorted by total number of components</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <TotalComponentsChart data={currentReport.componentInventory} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Inventory Breakdown</CardTitle>
                <CardDescription>Distribution of components, directives, pipes, and injectables</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ComponentInventoryChart data={currentReport.componentInventory} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Change Detection Strategies</CardTitle>
              <CardDescription>OnPush vs Implicit change detection by module</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChangeDetectionChart data={currentReport.changeDetection} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
