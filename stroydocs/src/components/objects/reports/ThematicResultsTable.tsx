'use client'
import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ThematicRow } from './useThematicReport'

interface ColumnMeta {
  key: string
  label: string
}

interface Props {
  rows: ThematicRow[]
  availableColumns: ColumnMeta[]
  selectedColumns: Set<string>
  isLoading: boolean
}

export function ThematicResultsTable({ rows, availableColumns, selectedColumns, isLoading }: Props) {
  // Строим динамические колонки из выбранных чекбоксов
  const columns = useMemo<ColumnDef<ThematicRow>[]>(() => {
    return availableColumns
      .filter(col => selectedColumns.has(col.key))
      .map(col => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        cell: ({ getValue }) => {
          const val = getValue()
          if (val === null || val === undefined) return '—'
          if (typeof val === 'boolean') return val ? 'Да' : 'Нет'
          return String(val)
        },
      }))
  }, [availableColumns, selectedColumns])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Результаты отчёта</span>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Нажмите «Сформировать» для получения данных
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(header => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
