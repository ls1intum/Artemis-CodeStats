"use client"

import { useState, useMemo } from "react"
import { 
  Trophy, Medal,
  ChevronDown, ChevronUp, ArrowUpDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { DecoratorlessAPIReport } from "../../types/reports"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ContributorStats {
  name: string;
  totalContributions: number;
  apisMigrated: number;
  lastMigrationDate: Date | null;
}

interface DecoratorlessContributorLeaderboardProps {
  currentData: DecoratorlessAPIReport;
  compareData: DecoratorlessAPIReport;
}

type SortKey = 'name' | 'totalContributions' | 'apisMigrated' | 'lastMigrationDate'
type SortDirection = 'asc' | 'desc'

export function DecoratorlessContributorLeaderboard({
  currentData,
  compareData
}: DecoratorlessContributorLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('apisMigrated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Helper function to calculate total decoratorless APIs
  const calculateDecoratorlessTotal = (data: Record<string, any>) => {
    let total = 0;
    
    Object.values(data).forEach((stats: any) => {
      total += 
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
    });
    
    return total;
  };
  
  // Process data for the leaderboard
  const contributorData = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    // Get all available reports
    const allReports: DecoratorlessAPIReport[] = (window as any).decoratorlessAPIReports || [];
    if (!allReports || allReports.length === 0) return [];
    
    // Find indices of current and compare reports
    const currentIndex = allReports.findIndex(
      report => report.metadata.artemis.commitHash === currentData.metadata.artemis.commitHash
    );
    const compareIndex = allReports.findIndex(
      report => report.metadata.artemis.commitHash === compareData.metadata.artemis.commitHash
    );
    
    if (currentIndex === -1 || compareIndex === -1) return [];
    
    // Determine the range of reports between compare and current
    const startIndex = Math.min(currentIndex, compareIndex);
    const endIndex = Math.max(currentIndex, compareIndex);
    
    // Get all reports in the range
    const relevantReports = allReports.slice(startIndex, endIndex + 1);
    
    // Sort reports chronologically
    relevantReports.sort((a, b) => 
      a.metadata.artemis.commitDate.getTime() - b.metadata.artemis.commitDate.getTime()
    );
    
    // Map to track contributors and their stats
    const contributorMap = new Map<string, ContributorStats>();
    
    // For each pair of consecutive reports, calculate the migration changes
    for (let i = 0; i < relevantReports.length - 1; i++) {
      const currentReport = relevantReports[i + 1]; // newer report
      const previousReport = relevantReports[i];    // older report
      
      // Get the commit author for this change
      const author = currentReport.metadata.artemis.commitAuthor;
      if (!author) continue;
      
      // For each module in the current report, calculate the change in decoratorless APIs
      let totalApisMigrated = 0;
      
      // Go through each module
      Object.keys(currentReport.decoratorlessAPI).forEach(moduleName => {
        const currentModule = currentReport.decoratorlessAPI[moduleName];
        const previousModule = previousReport.decoratorlessAPI[moduleName];
        
        // If module didn't exist before, count all of its decoratorless APIs
        if (!previousModule) {
          totalApisMigrated += 
            currentModule.inputFunction +
            currentModule.inputRequired +
            currentModule.outputFunction +
            currentModule.modelFunction +
            currentModule.viewChildFunction +
            currentModule.viewChildRequired +
            currentModule.viewChildrenFunction +
            currentModule.contentChildFunction +
            currentModule.contentChildRequired +
            currentModule.contentChildrenFunction;
          return;
        }
        
        // Compare each decoratorless API type separately
        totalApisMigrated += (currentModule.inputFunction - previousModule.inputFunction);
        totalApisMigrated += (currentModule.inputRequired - previousModule.inputRequired);
        totalApisMigrated += (currentModule.outputFunction - previousModule.outputFunction);
        totalApisMigrated += (currentModule.modelFunction - previousModule.modelFunction);
        totalApisMigrated += (currentModule.viewChildFunction - previousModule.viewChildFunction);
        totalApisMigrated += (currentModule.viewChildRequired - previousModule.viewChildRequired);
        totalApisMigrated += (currentModule.viewChildrenFunction - previousModule.viewChildrenFunction);
        totalApisMigrated += (currentModule.contentChildFunction - previousModule.contentChildFunction);
        totalApisMigrated += (currentModule.contentChildRequired - previousModule.contentChildRequired);
        totalApisMigrated += (currentModule.contentChildrenFunction - previousModule.contentChildrenFunction);
      });
      
      // Only count if there was an actual migration change
      if (totalApisMigrated !== 0) {
        // Create or update contributor stats
        if (!contributorMap.has(author)) {
          contributorMap.set(author, {
            name: author,
            totalContributions: 0,
            apisMigrated: 0,
            lastMigrationDate: null
          });
        }
        
        const stats = contributorMap.get(author)!;
        stats.apisMigrated += totalApisMigrated;
        stats.totalContributions += 1;
        stats.lastMigrationDate = currentReport.metadata.artemis.commitDate;
      }
    }
    
    // Return only contributors who made migration changes
    return Array.from(contributorMap.values())
      .filter(contributor => contributor.apisMigrated !== 0);
  }, [currentData, compareData]);

  const sortedData = useMemo(() => {
    return [...contributorData].sort((a, b) => {
      let comparison = 0;
      
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'totalContributions') {
        comparison = a.totalContributions - b.totalContributions;
      } else if (sortKey === 'apisMigrated') {
        comparison = a.apisMigrated - b.apisMigrated;
      } else if (sortKey === 'lastMigrationDate') {
        // Handle null dates (should be sorted last)
        if (a.lastMigrationDate === null) return sortDirection === 'asc' ? 1 : -1;
        if (b.lastMigrationDate === null) return sortDirection === 'asc' ? -1 : 1;
        comparison = a.lastMigrationDate.getTime() - b.lastMigrationDate.getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contributorData, sortKey, sortDirection]);
  
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
  
  // Create a rank map based on APIs migrated
  const rankMap = useMemo(() => {
    const ranks: Record<string, number> = {};
    
    // Sort by APIs migrated for ranking (always descending)
    const sortedByApisMigrated = [...contributorData]
      .sort((a, b) => b.apisMigrated - a.apisMigrated);
    
    // Assign ranks (handle ties with same rank)
    let currentRank = 1;
    let prevApisMigrated: number | null = null;
    
    sortedByApisMigrated.forEach((contributor, index) => {
      if (prevApisMigrated !== contributor.apisMigrated) {
        currentRank = index + 1;
      }
      
      ranks[contributor.name] = currentRank;
      prevApisMigrated = contributor.apisMigrated;
    });
    
    return ranks;
  }, [contributorData]);
  
  // Get avatar fallback (initials) from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  // Get medal icon for top 3
  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-700" />;
    return null;
  };
  
  // Format date as relative
  const formatRelativeDate = (date: Date | null) => {
    if (!date) return "Never";
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays !== 0) {
      return rtf.format(diffInDays, 'day');
    } else if (diffInHours !== 0) {
      return rtf.format(diffInHours, 'hour');
    } else if (diffInMins !== 0) {
      return rtf.format(diffInMins, 'minute');
    } else {
      return rtf.format(diffInSecs, 'second');
    }
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
                Contributor
                {sortKey === 'name' ? (
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
                onClick={() => handleSort('totalContributions')}
              >
                Migrations
                {sortKey === 'totalContributions' ? (
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
                onClick={() => handleSort('lastMigrationDate')}
              >
                Last Migration
                {sortKey === 'lastMigrationDate' ? (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((contributor) => {
            const rank = rankMap[contributor.name];
            return (
              <TableRow key={contributor.name}>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1">
                    {rank <= 3 && getMedalIcon(rank - 1)}
                    <span>{rank}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(contributor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{contributor.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contributor.totalContributions} contribution{contributor.totalContributions !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {contributor.apisMigrated === 0 ? (
                    <span className="text-muted-foreground text-sm">0</span>
                  ) : (
                    <Badge 
                      variant={contributor.apisMigrated > 0 ? "success" : "destructive"}
                      className="ml-auto"
                    >
                      {contributor.apisMigrated > 0 ? '+' : ''}
                      {contributor.apisMigrated}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {contributor.totalContributions}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatRelativeDate(contributor.lastMigrationDate)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
}