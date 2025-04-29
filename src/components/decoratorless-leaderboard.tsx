"use client"

import { useState } from "react"
import { 
  Trophy, Medal, ArrowUp, ArrowDown,
  ChevronDown, ChevronUp, ArrowUpDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { DecoratorlessAPIStats } from "../../types/reports"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DecoratorlessLeaderboardProps {
  currentData: Record<string, DecoratorlessAPIStats>
  compareData: Record<string, DecoratorlessAPIStats>
}

type SortKey = 'name' | 'percentage' | 'total' | 'change'
type SortDirection = 'asc' | 'desc'

export function DecoratorlessLeaderboard({
  currentData,
  compareData
}: DecoratorlessLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('percentage')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showCount, setShowCount] = useState<number>(10)

  // Process data for the leaderboard
  const processData = () => {
    const moduleData = Object.entries(currentData).map(([moduleName, stats]) => {
      // Calculate current percentage
      const decoratorlessCount =
        stats.inputFunction +
        stats.inputRequired +
        stats.outputFunction +
        stats.modelFunction +
        stats.viewChildFunction +
        stats.viewChildRequired +
        stats.viewChildrenFunction +
        stats.contentChildFunction +
        stats.contentChildRequired +
        stats.contentChildrenFunction;

      const decoratorCount =
        stats.inputDecorator +
        stats.outputDecorator +
        stats.viewChildDecorator +
        stats.viewChildrenDecorator +
        stats.contentChildDecorator;

      const total = decoratorlessCount + decoratorCount;
      const percentage = total > 0 ? (decoratorlessCount / total) * 100 : 0;

      // Get previous data for comparison if available
      let previousPercentage = 0;
      let change = 0;
      
      if (compareData[moduleName]) {
        const prevStats = compareData[moduleName];
        const prevDecoratorlessCount =
          prevStats.inputFunction +
          prevStats.inputRequired +
          prevStats.outputFunction +
          prevStats.modelFunction +
          prevStats.viewChildFunction +
          prevStats.viewChildRequired +
          prevStats.viewChildrenFunction +
          prevStats.contentChildFunction +
          prevStats.contentChildRequired +
          prevStats.contentChildrenFunction;

        const prevDecoratorCount =
          prevStats.inputDecorator +
          prevStats.outputDecorator +
          prevStats.viewChildDecorator +
          prevStats.viewChildrenDecorator +
          prevStats.contentChildDecorator;

        const prevTotal = prevDecoratorlessCount + prevDecoratorCount;
        previousPercentage = prevTotal > 0 ? (prevDecoratorlessCount / prevTotal) * 100 : 0;
        
        // Calculate change
        change = percentage - previousPercentage;
      }

      return {
        name: moduleName,
        percentage: Math.round(percentage * 10) / 10,
        decoratorlessCount,
        decoratorCount,
        total,
        previousPercentage: Math.round(previousPercentage * 10) / 10,
        change: Math.round(change * 10) / 10,
      };
    });

    // Filter out modules with no APIs
    return moduleData.filter(module => module.total > 0);
  };

  const sortData = (data: ReturnType<typeof processData>) => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'percentage') {
        comparison = a.percentage - b.percentage;
      } else if (sortKey === 'total') {
        comparison = a.total - b.total;
      } else if (sortKey === 'change') {
        comparison = a.change - b.change;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new sort column, except for name
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };
  
  const data = sortData(processData());
  
  // Get rank changes based on percentage
  const getRankChanges = () => {
    // Sort current data by percentage
    const currentOrder = processData()
      .sort((a, b) => b.percentage - a.percentage)
      .map(item => item.name);
      
    // Sort compare data by percentage
    const compareOrder = Object.entries(compareData)
      .map(([moduleName, stats]) => {
        const decoratorlessCount =
          stats.inputFunction +
          stats.inputRequired +
          stats.outputFunction +
          stats.modelFunction +
          stats.viewChildFunction +
          stats.viewChildRequired +
          stats.viewChildrenFunction +
          stats.contentChildFunction +
          stats.contentChildRequired +
          stats.contentChildrenFunction;

        const decoratorCount =
          stats.inputDecorator +
          stats.outputDecorator +
          stats.viewChildDecorator +
          stats.viewChildrenDecorator +
          stats.contentChildDecorator;

        const total = decoratorlessCount + decoratorCount;
        const percentage = total > 0 ? (decoratorlessCount / total) * 100 : 0;
        
        return {
          name: moduleName,
          percentage
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map(item => item.name);
    
    // Calculate rank changes
    const rankChanges: Record<string, number> = {};
    
    currentOrder.forEach((name, currentIndex) => {
      const compareIndex = compareOrder.indexOf(name);
      if (compareIndex !== -1) {
        rankChanges[name] = compareIndex - currentIndex;
      } else {
        rankChanges[name] = 0; // New module
      }
    });
    
    return rankChanges;
  };
  
  const rankChanges = getRankChanges();
  
  // Get medal icon for top 3
  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-700" />;
    return null;
  };
  
  const showAllModules = () => {
    setShowCount(data.length);
  };
  
  const showLessModules = () => {
    setShowCount(10);
  };
  
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                className="p-0 font-medium flex items-center gap-1"
                onClick={() => handleSort('name')}
              >
                Module
                {sortKey === 'name' ? (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                className="p-0 font-medium flex items-center gap-1"
                onClick={() => handleSort('percentage')}
              >
                Progress
                {sortKey === 'percentage' ? (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button 
                variant="ghost" 
                className="p-0 font-medium flex items-center gap-1 ml-auto"
                onClick={() => handleSort('change')}
              >
                Change
                {sortKey === 'change' ? (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button 
                variant="ghost" 
                className="p-0 font-medium flex items-center gap-1 ml-auto"
                onClick={() => handleSort('total')}
              >
                Total APIs
                {sortKey === 'total' ? (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, showCount).map((module, index) => (
            <TableRow key={module.name}>
              <TableCell className="font-medium flex items-center gap-1">
                {getMedalIcon(index)}
                <span>{index + 1}</span>
                {rankChanges[module.name] > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ArrowUp className="h-3 w-3 text-green-500 ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Moved up {rankChanges[module.name]} positions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {rankChanges[module.name] < 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ArrowDown className="h-3 w-3 text-red-500 ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Moved down {Math.abs(rankChanges[module.name])} positions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell>{module.name}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span>{module.percentage}%</span>
                    <span className="text-xs text-muted-foreground">
                      {module.decoratorlessCount}/{module.total}
                    </span>
                  </div>
                  <Progress value={module.percentage} className="h-2" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                {module.change !== 0 ? (
                  <Badge 
                    variant={module.change > 0 ? "success" : "destructive"}
                    className="ml-auto"
                  >
                    {module.change > 0 && '+'}
                    {module.change}%
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">No change</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">{module.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.length > 10 && (
        <div className="flex justify-center mt-4">
          {showCount < data.length ? (
            <Button variant="outline" size="sm" onClick={showAllModules}>
              Show all {data.length} modules
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={showLessModules}>
              Show less
            </Button>
          )}
        </div>
      )}
    </div>
  )
}