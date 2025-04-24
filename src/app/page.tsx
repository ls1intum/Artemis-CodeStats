"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComponentInventoryTable } from "@/components/component-inventory-table"
import { ChangeDetectionTable } from "@/components/change-detection-table"
import { ComponentInventoryChart } from "@/components/component-inventory-chart"
import { ChangeDetectionChart } from "@/components/change-detection-chart"
import { TotalComponentsChart } from "@/components/total-components-chart"
import reportData from "@/../data/angular-debt-report-2025-04-24T16-35-47-908Z.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function AngularDebtDashboard() {
  const [activeTab, setActiveTab] = useState("tables")
  const [error, setError] = useState<string | null>(null)

  // Validate data before rendering
  if (!reportData || !reportData.componentInventory || !reportData.changeDetection) {
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
          {reportData.metadata?.title || "Angular Technical Debt Analysis"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Generated on:{" "}
          {reportData.metadata?.generatedAt ? new Date(reportData.metadata.generatedAt).toLocaleString() : "N/A"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tables" onValueChange={setActiveTab} className="w-full">
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
              <ComponentInventoryTable data={reportData.componentInventory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Detection Strategies</CardTitle>
              <CardDescription>Analysis of change detection strategies used across modules</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeDetectionTable data={reportData.changeDetection} />
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
                <TotalComponentsChart data={reportData.componentInventory} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Inventory Breakdown</CardTitle>
                <CardDescription>Distribution of components, directives, pipes, and injectables</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ComponentInventoryChart data={reportData.componentInventory} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Change Detection Strategies</CardTitle>
              <CardDescription>OnPush vs Implicit change detection by module</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChangeDetectionChart data={reportData.changeDetection} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
