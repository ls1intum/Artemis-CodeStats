"use client"

import type { DecoratorlessAPIReport } from "../../report/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts"

// Update the props to include the comparison report
interface DecoratorlessOverviewChartProps {
  data: DecoratorlessAPIReport;
  compareData: DecoratorlessAPIReport;
}

export function DecoratorlessOverviewChart({ data, compareData }: DecoratorlessOverviewChartProps) {
  // Process data for the chart
  const processData = () => {
    const currentAPI = data.decoratorlessAPI;
    const compareAPI = compareData.decoratorlessAPI;

    // Helper to get all modules from both reports
    const allModules = new Set([
      ...Object.keys(currentAPI),
      ...Object.keys(compareAPI)
    ]);

    // Aggregate data across all modules
    const current = {
      inputs: { decoratorless: 0, decorator: 0 },
      outputs: { decoratorless: 0, decorator: 0 },
      viewChildQueries: { decoratorless: 0, decorator: 0 },
      viewChildrenQueries: { decoratorless: 0, decorator: 0 },
      contentChildQueries: { decoratorless: 0, decorator: 0 }
    };

    const previous = { ...current };

    // Process current report
    allModules.forEach(moduleName => {
      const module = currentAPI[moduleName] || {
        inputFunction: 0, inputRequired: 0, inputDecorator: 0,
        outputFunction: 0, outputDecorator: 0,
        modelFunction: 0,
        viewChildFunction: 0, viewChildRequired: 0, viewChildDecorator: 0,
        viewChildrenFunction: 0, viewChildrenDecorator: 0,
        contentChildFunction: 0, contentChildRequired: 0, contentChildDecorator: 0
      };

      // Inputs
      current.inputs.decoratorless += module.inputFunction + module.inputRequired;
      current.inputs.decorator += module.inputDecorator;

      // Outputs
      current.outputs.decoratorless += module.outputFunction;
      current.outputs.decorator += module.outputDecorator;

      // ViewChild queries
      current.viewChildQueries.decoratorless += module.viewChildFunction + module.viewChildRequired;
      current.viewChildQueries.decorator += module.viewChildDecorator;
      
      // ViewChildren queries
      current.viewChildrenQueries.decoratorless += module.viewChildrenFunction;
      current.viewChildrenQueries.decorator += module.viewChildrenDecorator;
      
      // ContentChild queries
      current.contentChildQueries.decoratorless += module.contentChildFunction + module.contentChildRequired;
      current.contentChildQueries.decorator += module.contentChildDecorator;

      // Process comparison report
      const compareModule = compareAPI[moduleName] || {
        inputFunction: 0, inputRequired: 0, inputDecorator: 0,
        outputFunction: 0, outputDecorator: 0,
        modelFunction: 0,
        viewChildFunction: 0, viewChildRequired: 0, viewChildDecorator: 0,
        viewChildrenFunction: 0, viewChildrenDecorator: 0,
        contentChildFunction: 0, contentChildRequired: 0, contentChildDecorator: 0
      };

      // Inputs
      previous.inputs.decoratorless += compareModule.inputFunction + compareModule.inputRequired;
      previous.inputs.decorator += compareModule.inputDecorator;

      // Outputs
      previous.outputs.decoratorless += compareModule.outputFunction;
      previous.outputs.decorator += compareModule.outputDecorator;

      // ViewChild queries
      previous.viewChildQueries.decoratorless += compareModule.viewChildFunction + compareModule.viewChildRequired;
      previous.viewChildQueries.decorator += compareModule.viewChildDecorator;
      
      // ViewChildren queries
      previous.viewChildrenQueries.decoratorless += compareModule.viewChildrenFunction;
      previous.viewChildrenQueries.decorator += compareModule.viewChildrenDecorator;
      
      // ContentChild queries
      previous.contentChildQueries.decoratorless += compareModule.contentChildFunction + compareModule.contentChildRequired;
      previous.contentChildQueries.decorator += compareModule.contentChildDecorator;
    });
    
    // Calculate percentages
    const calculatePercentage = (decoratorless: number, decorator: number) => {
      const total = decoratorless + decorator;
      return total > 0 ? Math.round((decoratorless / total) * 100) : 100; // 100% if no APIs
    };

    // Calculate changes
    const calculateChange = (current: { decoratorless: number, decorator: number }, previous: { decoratorless: number, decorator: number }) => {
      const currentPercentage = calculatePercentage(current.decoratorless, current.decorator);
      
      const prevPercentage = calculatePercentage(previous.decoratorless, previous.decorator);
      
      return currentPercentage - prevPercentage;
    };

    return [
      {
        name: "Inputs",
        decoratorless: current.inputs.decoratorless,
        decorator: current.inputs.decorator,
        total: current.inputs.decoratorless + current.inputs.decorator,
        percentage: calculatePercentage(current.inputs.decoratorless, current.inputs.decorator),
        change: calculateChange(current.inputs, previous.inputs)
      },
      {
        name: "Outputs",
        decoratorless: current.outputs.decoratorless,
        decorator: current.outputs.decorator,
        total: current.outputs.decoratorless + current.outputs.decorator,
        percentage: calculatePercentage(current.outputs.decoratorless, current.outputs.decorator),
        change: calculateChange(current.outputs, previous.outputs)
      },
      {
        name: "ViewChild",
        decoratorless: current.viewChildQueries.decoratorless,
        decorator: current.viewChildQueries.decorator,
        total: current.viewChildQueries.decoratorless + current.viewChildQueries.decorator,
        percentage: calculatePercentage(current.viewChildQueries.decoratorless, current.viewChildQueries.decorator),
        change: calculateChange(current.viewChildQueries, previous.viewChildQueries)
      },
      {
        name: "ViewChildren",
        decoratorless: current.viewChildrenQueries.decoratorless,
        decorator: current.viewChildrenQueries.decorator,
        total: current.viewChildrenQueries.decoratorless + current.viewChildrenQueries.decorator,
        percentage: calculatePercentage(current.viewChildrenQueries.decoratorless, current.viewChildrenQueries.decorator),
        change: calculateChange(current.viewChildrenQueries, previous.viewChildrenQueries)
      },
      {
        name: "ContentChild",
        decoratorless: current.contentChildQueries.decoratorless,
        decorator: current.contentChildQueries.decorator,
        total: current.contentChildQueries.decoratorless + current.contentChildQueries.decorator,
        percentage: calculatePercentage(current.contentChildQueries.decoratorless, current.contentChildQueries.decorator),
        change: calculateChange(current.contentChildQueries, previous.contentChildQueries)
      }
    ].sort((a, b) => b.total - a.total);
  };

  const chartData = processData();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<any>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-sm text-green-500">Decoratorless: {data.decoratorless}</p>
          <p className="text-sm text-red-500">Decorator: {data.decorator}</p>
          <p className="text-sm font-medium mt-1">{data.percentage}% Migrated</p>
          <p className="text-xs mt-1">
            {data.change > 0 && '+'}
            {data.change}% from comparison
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={90} 
            tick={{ fontSize: 12 }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => {
              return value === 'percentage' ? 'Migration %' : value.charAt(0).toUpperCase() + value.slice(1)
            }} 
          />
          <Bar 
            dataKey="decorator" 
            stackId="a" 
            fill="var(--chart-1)" 
            name="Decorator"
          />
          <Bar 
            dataKey="decoratorless" 
            stackId="a" 
            fill="var(--chart-2)" 
            name="Decoratorless" 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}