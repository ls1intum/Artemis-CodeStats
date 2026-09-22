import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right'
    className?: string
  }
}

// The shadcn data-table recipe over TanStack Table: sortable headers, an optional search box,
// a sticky header inside a scroll box, and row-level styling hooks.
export function DataTable<T>({
  columns,
  data,
  initialSorting = [],
  search,
  maxHeight,
  getRowId,
  rowClassName,
  empty = 'Nothing to show.',
  toolbar,
  footer,
}: {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  initialSorting?: SortingState
  search?: string
  maxHeight?: string
  getRowId?: (row: T) => string
  rowClassName?: (row: Row<T>) => string | undefined
  empty?: string
  toolbar?: React.ReactNode
  footer?: React.ReactNode
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState('')
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
    sortDescFirst: true,
  })
  const rows = table.getRowModel().rows
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {(search || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {search && (
            <Input
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={search}
              aria-label={search}
              className="w-72"
            />
          )}
          {toolbar}
        </div>
      )}
      <div className={cn(maxHeight && 'overflow-auto', maxHeight)}>
        <Table>
          <TableHeader className={cn(maxHeight && 'sticky top-0 z-10 bg-card')}>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const align = header.column.columnDef.meta?.align
                  const label = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : header.column.getCanSort()
                              ? 'none'
                              : undefined
                      }
                      className={cn(
                        align === 'right' && 'text-right',
                        header.column.columnDef.meta?.className,
                      )}
                    >
                      {header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            '-mx-2 h-7 gap-1 px-2 font-medium',
                            align === 'right' && 'flex-row-reverse',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {label}
                          {sorted === 'asc' ? (
                            <ArrowUp aria-hidden="true" className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : (
                            <ArrowUpDown
                              aria-hidden="true"
                              className="size-3.5 opacity-40"
                            />
                          )}
                        </Button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className={rowClassName?.(row)}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          meta?.align === 'right' && 'text-right tabular-nums',
                          meta?.className,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-6 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footer}
        </Table>
      </div>
    </div>
  )
}
