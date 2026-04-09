'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectsTable, type ProjectItem } from './useProjectsTable';
import { type ColumnDef } from '@tanstack/react-table';

// Колонка прогресса ИД — JSX здесь, а не в хуке (.ts не поддерживает JSX)
const progressColumn: ColumnDef<ProjectItem, unknown> = {
  id: 'progress',
  header: 'Прогресс ИД',
  cell: ({ row }) => {
    const pct = row.original.idReadinessPercent ?? 0;
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-8">{pct}%</span>
      </div>
    );
  },
};

export function ProjectsTable() {
  const { projects, columns: baseColumns, isLoading } = useProjectsTable();

  const columns: ColumnDef<ProjectItem, unknown>[] = useMemo(() => {
    const cols = baseColumns.map((col, i) => {
      // Обернём первую колонку ссылкой
      if (i === 0) {
        return {
          ...col,
          cell: ({ row }: { row: { original: ProjectItem } }) => (
            <Link
              href={`/objects/${row.original.id}/passport`}
              className="font-medium text-primary hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        };
      }
      return col;
    });
    // Вставляем колонку прогресса после "Статус" (индекс 4 → вставить на 5)
    cols.splice(5, 0, progressColumn);
    return cols;
  }, [baseColumns]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={projects}
      searchColumn="name"
      searchPlaceholder="Поиск по названию..."
    />
  );
}
