"use client"

import { useState, useMemo } from "react"
import { ExternalLink, Search, Filter, ChevronDown, ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DtoViolationsReport, EntityReturnViolation, EntityInputViolation, DtoEntityFieldViolation } from "../../report/types"

interface DtoViolationsExplorerProps {
  data: DtoViolationsReport
}

type ViolationType = 'return' | 'input' | 'field'

interface FlattenedViolation {
  module: string
  type: ViolationType
  controller?: string
  method?: string
  endpoint?: string
  returnType?: string
  parameterName?: string
  parameterType?: string
  annotationType?: string
  dtoClass?: string
  fieldName?: string
  fieldType?: string
  entityClass: string
  file: string
}

const ARTEMIS_GITHUB_BASE = "https://github.com/ls1intum/Artemis/blob/develop/src/main/java/"

export function DtoViolationsExplorer({ data }: DtoViolationsExplorerProps) {
  const [search, setSearch] = useState("")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Flatten all violations into a single list
  const allViolations = useMemo(() => {
    const violations: FlattenedViolation[] = []

    Object.entries(data.dtoViolations.modules).forEach(([module, stats]) => {
      // Entity return violations
      stats.entityReturnDetails?.forEach((v: EntityReturnViolation) => {
        violations.push({
          module,
          type: 'return',
          controller: v.controller,
          method: v.method,
          endpoint: v.endpoint,
          returnType: v.returnType,
          entityClass: v.entityClass,
          file: v.file
        })
      })

      // Entity input violations
      stats.entityInputDetails?.forEach((v: EntityInputViolation) => {
        violations.push({
          module,
          type: 'input',
          controller: v.controller,
          method: v.method,
          endpoint: v.endpoint,
          parameterName: v.parameterName,
          parameterType: v.parameterType,
          annotationType: v.annotationType,
          entityClass: v.entityClass,
          file: v.file
        })
      })

      // DTO field violations
      stats.dtoEntityFieldDetails?.forEach((v: DtoEntityFieldViolation) => {
        violations.push({
          module,
          type: 'field',
          dtoClass: v.dtoClass,
          fieldName: v.fieldName,
          fieldType: v.fieldType,
          entityClass: v.entityClass,
          file: v.file
        })
      })
    })

    return violations
  }, [data])

  // Get unique modules for filter
  const modules = useMemo(() =>
    [...new Set(allViolations.map(v => v.module))].sort(),
    [allViolations]
  )

  // Get unique entity classes for filter
  const entityClasses = useMemo(() =>
    [...new Set(allViolations.map(v => v.entityClass))].sort(),
    [allViolations]
  )

  // Get entity counts for top offenders
  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allViolations.forEach(v => {
      counts[v.entityClass] = (counts[v.entityClass] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [allViolations])

  // Filter violations
  const filteredViolations = useMemo(() => {
    return allViolations.filter(v => {
      // Module filter
      if (moduleFilter !== "all" && v.module !== moduleFilter) return false

      // Type filter
      if (typeFilter !== "all" && v.type !== typeFilter) return false

      // Entity filter
      if (entityFilter !== "all" && v.entityClass !== entityFilter) return false

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const searchFields = [
          v.module,
          v.controller,
          v.method,
          v.endpoint,
          v.dtoClass,
          v.fieldName,
          v.entityClass,
          v.file
        ].filter(Boolean).join(' ').toLowerCase()

        if (!searchFields.includes(searchLower)) return false
      }

      return true
    })
  }, [allViolations, moduleFilter, typeFilter, entityFilter, search])

  // Group by module for collapsible view
  const groupedByModule = useMemo(() => {
    const groups: Record<string, FlattenedViolation[]> = {}
    filteredViolations.forEach(v => {
      if (!groups[v.module]) groups[v.module] = []
      groups[v.module].push(v)
    })
    return groups
  }, [filteredViolations])

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(module)) {
      newExpanded.delete(module)
    } else {
      newExpanded.add(module)
    }
    setExpandedModules(newExpanded)
  }

  const expandAll = () => setExpandedModules(new Set(modules))
  const collapseAll = () => setExpandedModules(new Set())

  const getTypeLabel = (type: ViolationType) => {
    switch (type) {
      case 'return': return 'Entity Return'
      case 'input': return 'Entity Input'
      case 'field': return 'DTO Field'
    }
  }

  const getTypeBadgeVariant = (type: ViolationType) => {
    switch (type) {
      case 'return': return 'destructive'
      case 'input': return 'default'
      case 'field': return 'secondary'
    }
  }

  const getGithubUrl = (file: string) => {
    return ARTEMIS_GITHUB_BASE + file
  }

  return (
    <div className="space-y-4">
      {/* Top Entity Offenders */}
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="text-slate-500 font-medium">Top entities:</span>
        {entityCounts.map(([entity, count]) => (
          <Button
            key={entity}
            variant={entityFilter === entity ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEntityFilter(entityFilter === entity ? "all" : entity)}
          >
            {entity} <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search endpoints, classes, files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {modules.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="return">Entity Returns</SelectItem>
            <SelectItem value="input">Entity Inputs</SelectItem>
            <SelectItem value="field">DTO Fields</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities ({entityClasses.length})</SelectItem>
            {entityClasses.map(e => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-slate-600">
        <span>Showing <strong>{filteredViolations.length}</strong> of {allViolations.length} violations</span>
        <span>|</span>
        <span className="text-red-600">{filteredViolations.filter(v => v.type === 'return').length} returns</span>
        <span className="text-orange-600">{filteredViolations.filter(v => v.type === 'input').length} inputs</span>
        <span className="text-slate-600">{filteredViolations.filter(v => v.type === 'field').length} fields</span>
      </div>

      {/* Grouped violations */}
      <div className="space-y-2">
        {Object.entries(groupedByModule).sort((a, b) => b[1].length - a[1].length).map(([module, violations]) => (
          <Collapsible
            key={module}
            open={expandedModules.has(module)}
            onOpenChange={() => toggleModule(module)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-4 py-3 h-auto bg-slate-50 hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  {expandedModules.has(module) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{module}</span>
                  <Badge variant="outline">{violations.length} violations</Badge>
                </div>
                <div className="flex gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {violations.filter(v => v.type === 'return').length} ret
                  </Badge>
                  <Badge className="text-xs">
                    {violations.filter(v => v.type === 'input').length} in
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {violations.filter(v => v.type === 'field').length} fld
                  </Badge>
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border rounded-b-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="w-[60px]">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((v, i) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(v.type) as "default" | "secondary" | "destructive"}>
                            {getTypeLabel(v.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {v.type === 'field' ? (
                            <div>
                              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                                {v.dtoClass}.{v.fieldName}
                              </code>
                              <span className="text-slate-500 ml-2 text-xs">{v.fieldType}</span>
                            </div>
                          ) : (
                            <div>
                              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                                {v.controller}.{v.method}()
                              </code>
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                {v.endpoint}
                              </div>
                              {v.type === 'input' && (
                                <div className="text-xs text-orange-600 mt-0.5">
                                  {v.annotationType} {v.parameterName}: {v.parameterType}
                                </div>
                              )}
                              {v.type === 'return' && (
                                <div className="text-xs text-red-600 mt-0.5">
                                  returns {v.returnType}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-semibold text-purple-700">{v.entityClass}</code>
                        </TableCell>
                        <TableCell>
                          <a
                            href={getGithubUrl(v.file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {filteredViolations.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No violations match your filters
        </div>
      )}
    </div>
  )
}
