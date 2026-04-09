'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/utils/format';

type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CONFIRMED' | 'REJECTED';

interface SkDefect {
  id: string;
  title: string;
  description: string | null;
  status: DefectStatus;
  normativeRef: string | null;
  deadline: string | null;
  author: { id: string; firstName: string; lastName: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
  contract: { id: string; number: string; name: string } | null;
  createdAt: string;
}

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

const STATUS_VARIANTS: Record<DefectStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  OPEN:        'outline',
  IN_PROGRESS: 'outline',
  RESOLVED:    'secondary',
  CONFIRMED:   'default',
  REJECTED:    'destructive',
};

const SUMMARY_ROWS: { label: string; key: DefectStatus | 'total' }[] = [
  { label: 'Всего',       key: 'total' },
  { label: 'Открыто',     key: 'OPEN' },
  { label: 'В работе',    key: 'IN_PROGRESS' },
  { label: 'Устранено',   key: 'RESOLVED' },
  { label: 'Подтверждено', key: 'CONFIRMED' },
];

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.lastName} ${user.firstName}`.trim();
}

const columns: ColumnDef<SkDefect>[] = [
  {
    id: 'index',
    header: '№',
    cell: ({ row }) => row.index + 1,
    size: 48,
  },
  {
    accessorKey: 'author',
    header: 'Кем выдано',
    cell: ({ row }) => fullName(row.original.author),
  },
  {
    id: 'titleDesc',
    header: 'Описание недостатка',
    cell: ({ row }) => (
      <span className="block max-w-xs truncate" title={row.original.description ?? row.original.title}>
        {row.original.title}
        {row.original.description && (
          <span className="block text-xs text-muted-foreground truncate">{row.original.description}</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'deadline',
    header: 'Срок устранения',
    cell: ({ row }) =>
      row.original.deadline
        ? formatDate(row.original.deadline)
        : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'assignee',
    header: 'Контроль устранения',
    cell: ({ row }) =>
      row.original.assignee
        ? fullName(row.original.assignee)
        : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]}>
        {STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: 'normativeRef',
    header: 'Мероприятия по устранению',
    cell: ({ row }) =>
      row.original.normativeRef ?? <span className="text-muted-foreground">—</span>,
  },
];

interface Props {
  projectId: string;
}

export function PassportSkView({ projectId }: Props) {
  const { data: response, isLoading } = useQuery<{ data: SkDefect[]; total: number }>({
    queryKey: ['passport-sk-defects', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/defects?limit=200`);
      const json = (await res.json()) as { success: boolean; data: { data: SkDefect[]; total: number } };
      if (!json.success) throw new Error('Ошибка загрузки дефектов');
      return json.data;
    },
    enabled: !!projectId,
  });

  const defects = response?.data ?? [];

  const counts = useMemo<Record<DefectStatus | 'total', number>>(() => {
    const acc: Record<DefectStatus | 'total', number> = {
      total: defects.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CONFIRMED: 0,
      REJECTED: 0,
    };
    for (const d of defects) acc[d.status]++;
    return acc;
  }, [defects]);

  return (
    <div className="flex gap-4">
      {/* Левая панель — сводка */}
      <div className="w-[200px] shrink-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Сводка</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <tbody>
                {SUMMARY_ROWS.map(({ label, key }) => (
                  <tr key={key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5">{label}</td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {counts[key] || <span className="text-muted-foreground">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Правая панель — таблица */}
      <div className="flex-1 min-w-0">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Строительный контроль — недостатки</h2>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Загрузка...</p>
        ) : (
          <DataTable
            columns={columns}
            data={defects}
            searchColumn="titleDesc"
            searchPlaceholder="Поиск по описанию..."
          />
        )}
      </div>
    </div>
  );
}
