"use client"

import { useState } from "react"
import { 
  Trophy, Medal,
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

interface DecoratorlessLeaderboardProps {
  currentData: Record<string, DecoratorlessAPIStats>
  compareData: Record<string, DecoratorlessAPIStats>
}

type SortKey = 'name' | 'percentage' | 'total' | 'change' | 'apisMigrated'
type SortDirection = 'asc' | 'desc'

export function DecoratorlessLeaderboard({
  currentData,
  compareData
}: DecoratorlessLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('apisMigrated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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
      const percentage = total > 0 ? (decoratorlessCount / total) * 100 : 100; // If no APIs, consider it 100% migrated

      // Get previous data for comparison if available
      let previousPercentage = 0;
      let change = 0;
      let apisMigrated = 0;
      
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
        previousPercentage = prevTotal > 0 ? (prevDecoratorlessCount / prevTotal) * 100 : 100; // If no APIs, consider it 100% migrated
        
        // Calculate change
        change = percentage - previousPercentage;
        
        // Calculate APIs migrated (allow negative values to show regression)
        apisMigrated = decoratorlessCount - prevDecoratorlessCount;
      }

      return {
        name: moduleName,
        percentage: Math.round(percentage * 10) / 10,
        decoratorlessCount,
        decoratorCount,
        total,
        previousPercentage: Math.round(previousPercentage * 10) / 10,
        change: Math.round(change * 10) / 10,
        apisMigrated,
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
      } else if (sortKey === 'apisMigrated') {
        comparison = a.apisMigrated - b.apisMigrated;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  // Calculate the true rank based on APIs migrated (regardless of current sort)
  const calculateRank = (data: ReturnType<typeof processData>) => {
    // Create a map of module name to its rank based on APIs migrated
    const rankMap: Record<string, number> = {};
    
    // Sort by APIs migrated (always descending for ranking)
    const sortedByApisMigrated = [...data].sort((a, b) => b.apisMigrated - a.apisMigrated);
    
    // Assign ranks (handle ties by giving the same rank)
    let currentRank = 1;
    let prevApisMigrated: number | null = null;
    
    sortedByApisMigrated.forEach((module, index) => {
      // If this number of migrated APIs is different from previous, assign a new rank
      if (prevApisMigrated !== module.apisMigrated) {
        currentRank = index + 1;
      }
      
      rankMap[module.name] = currentRank;
      prevApisMigrated = module.apisMigrated;
    });
    
    return rankMap;
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
  const ranksByApisMigrated = calculateRank(processData());
  
  // Get medal icon for top 3
  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-700" />;
    return null;
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
                onClick={() => handleSort('apisMigrated')}
              >
                APIs Migrated
                {sortKey === 'apisMigrated' ? (
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
          {data.map((module, _index) => (
            <TableRow key={module.name}>
              <TableCell className="text-center">
                <div className="inline-flex items-center gap-1">
                  {ranksByApisMigrated[module.name] <= 3 && getMedalIcon(ranksByApisMigrated[module.name] - 1)}
                  <span>{ranksByApisMigrated[module.name]}</span>
                </div>
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
              <TableCell className="text-right w-[200px]">
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
              <TableCell className="text-right w-[100px]">
                {module.apisMigrated !== 0 ? (
                  <Badge 
                    variant={module.apisMigrated > 0 ? "success" : "destructive"}
                    className="ml-auto"
                  >
                    {module.apisMigrated > 0 && '+'}
                    {module.apisMigrated}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">0</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium w-[100px]">{module.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}