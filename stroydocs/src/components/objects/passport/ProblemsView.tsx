'use client';

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ProblemIssueType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/utils/format';
import { useProblemIssues, type ProblemIssue } from './useProblemIssues';
import { CreateProblemDialog } from './CreateProblemDialog';

export const PROBLEM_TYPE_LABELS: Record<ProblemIssueType, string> = {
  CORRECTION_PSD: 'Корректировка ПСД',
  LAND_LEGAL:     'Земельно-правовые',
  PRODUCTION:     'Производственные',
  ORG_LEGAL:      'Организационно-правовые',
  CONTRACT_WORK:  'Договорная работа',
  FINANCIAL:      'Финансовые',
  OTHER:          'Прочие',
};

const TYPE_ORDER = Object.keys(PROBLEM_TYPE_LABELS) as ProblemIssueType[];

const columns: ColumnDef<ProblemIssue>[] = [
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => PROBLEM_TYPE_LABELS[row.original.type],
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) =>
      row.original.status === 'ACTIVE' ? (
        <Badge variant="outline" className="text-yellow-600 border-yellow-400">Актуальный</Badge>
      ) : (
        <Badge variant="secondary">Закрыт</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Дата',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: 'description',
    header: 'Проблемный вопрос',
    cell: ({ row }) => (
      <span className="block max-w-xs truncate" title={row.original.description}>
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: 'responsible',
    header: 'Исполнитель',
    cell: ({ row }) => row.original.responsible ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'closedAt',
    header: 'Проверено',
    cell: ({ row }) =>
      row.original.closedAt ? (
        formatDate(row.original.closedAt)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

interface Props {
  projectId: string;
}

export function ProblemsView({ projectId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const { issues, isLoading, summary } = useProblemIssues(projectId);

  // Итоговые счётчики
  const totals = useMemo(
    () => TYPE_ORDER.reduce(
      (acc, t) => ({ active: acc.active + summary[t].active, closed: acc.closed + summary[t].closed }),
      { active: 0, closed: 0 },
    ),
    [summary],
  );

  return (
    <div className="flex gap-4">
      {/* Левая панель — сводка по типам */}
      <div className="w-[220px] shrink-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Сводка</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Тип</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Закр.</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Акт.</th>
                </tr>
              </thead>
              <tbody>
                {TYPE_ORDER.map((t) => (
                  <tr key={t} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 leading-tight">{PROBLEM_TYPE_LABELS[t]}</td>
                    <td className="px-2 py-1.5 text-center">
                      {summary[t].closed || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {summary[t].active || <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/50 font-medium">
                  <td className="px-3 py-1.5">Итого</td>
                  <td className="px-2 py-1.5 text-center">{totals.closed || '-'}</td>
                  <td className="px-2 py-1.5 text-center">{totals.active || '-'}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Правая панель — таблица */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Проблемные вопросы</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>Добавить</Button>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Загрузка...</p>
        ) : (
          <DataTable
            columns={columns}
            data={issues}
            searchColumn="description"
            searchPlaceholder="Поиск по описанию..."
          />
        )}
      </div>

      <CreateProblemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
      />
    </div>
  );
}
