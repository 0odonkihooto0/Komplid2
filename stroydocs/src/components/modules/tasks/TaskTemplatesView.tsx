'use client';

import { useState } from 'react';
import {
  useReactTable, getCoreRowModel, flexRender, type ColumnDef,
} from '@tanstack/react-table';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTaskTemplates, type TaskTemplateItem } from './useTaskTemplates';
import { CreateTaskTemplateDialog } from './CreateTaskTemplateDialog';
import { TaskTemplateCard } from './TaskTemplateCard';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий', MEDIUM: 'Обычный', HIGH: 'Высокий', CRITICAL: 'Критичный',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes % 1440 === 0) return `${minutes / 1440} дн`;
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  return `${minutes} мин`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function TaskTemplatesView() {
  const { templates, isLoading } = useTaskTemplates();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: ColumnDef<TaskTemplateItem>[] = [
    {
      accessorKey: 'name',
      header: 'Название',
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-gray-900 hover:text-blue-600 transition-colors"
          onClick={() => setSelectedId(row.original.id)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'taskType',
      header: 'Тип',
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">{row.original.taskType?.name ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'group',
      header: 'Группа',
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">{row.original.group?.name ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Приоритет',
      cell: ({ row }) => {
        const p = row.original.priority;
        return (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[p] ?? 'bg-gray-100 text-gray-600'}`}>
            {PRIORITY_LABELS[p] ?? p}
          </span>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: 'Длительность',
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">{formatDuration(row.original.duration)}</span>
      ),
    },
    {
      id: 'activeSchedules',
      header: 'Расписаний',
      cell: ({ row }) => {
        const count = row.original.schedules.filter((s) => s.isActive).length;
        return (
          <span className={`text-sm ${count > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            {count}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ row }) => (
        <span className="text-gray-500 text-sm">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      accessorKey: 'author',
      header: 'Автор',
      cell: ({ row }) => {
        const a = row.original.author;
        return (
          <span className="text-gray-600 text-sm">{a.firstName} {a.lastName}</span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          Шаблоны задач
          {templates.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{templates.length}</span>
          )}
        </h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Создать шаблон
        </Button>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Нет шаблонов</p>
            <p className="text-xs text-gray-400 mt-1">Создайте первый шаблон для автоматизации задач</p>
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Создать шаблон
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="text-xs">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedId(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateTaskTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />

      {selectedId && (
        <TaskTemplateCard
          templateId={selectedId}
          open={!!selectedId}
          onOpenChange={(v) => { if (!v) setSelectedId(null); }}
        />
      )}
    </div>
  );
}
