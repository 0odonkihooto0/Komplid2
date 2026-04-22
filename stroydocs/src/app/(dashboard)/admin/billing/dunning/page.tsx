'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useAdminDunning, useDunningRetry, useDunningToGrace, useDunningToExpired } from '@/hooks/useAdminBillingSubscriptions';
import { toast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';

interface DunningSub {
  id: string;
  status: string;
  dunningAttempts: number;
  nextDunningAt: string | null;
  graceUntil: string | null;
  plan: { name: string };
  workspace: {
    owner: { email: string };
    organization: { name: string } | null;
    name: string;
  };
  dunningAttemptsList: Array<{ attemptNumber: number; result: string | null; executedAt: string | null }>;
}

// Кнопки действий вынесены в отдельный компонент чтобы каждая строка имела свои хуки
function DunningActions({ sub }: { sub: DunningSub }) {
  const retry = useDunningRetry(sub.id);
  const toGrace = useDunningToGrace(sub.id);
  const toExpired = useDunningToExpired(sub.id);

  async function run(fn: () => Promise<unknown>, label: string) {
    try {
      await fn();
      toast({ title: `${label}: выполнено` });
    } catch (e) {
      toast({ title: `Ошибка: ${label}`, description: String(e), variant: 'destructive' });
    }
  }

  return (
    <div className="flex gap-1">
      {sub.status === 'PAST_DUE' && (
        <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => run(retry.mutateAsync, 'Повтор')}>Повторить</Button>
      )}
      {sub.status === 'PAST_DUE' && (
        <Button size="sm" variant="outline" disabled={toGrace.isPending} onClick={() => run(toGrace.mutateAsync, 'Grace')}>В grace</Button>
      )}
      <Button size="sm" variant="destructive" disabled={toExpired.isPending} onClick={() => run(toExpired.mutateAsync, 'Блокировка')}>Заблокировать</Button>
    </div>
  );
}

export default function AdminDunningPage() {
  const { data: subs = [], isLoading } = useAdminDunning();

  const columns: ColumnDef<DunningSub>[] = [
    { id: 'org', header: 'Организация', cell: ({ row }) => row.original.workspace.organization?.name ?? row.original.workspace.name },
    { id: 'email', header: 'Email', cell: ({ row }) => row.original.workspace.owner.email },
    { accessorKey: 'plan.name', header: 'Тариф', cell: ({ row }) => row.original.plan.name },
    { id: 'status', header: 'Статус', cell: ({ row }) => <Badge variant={row.original.status === 'PAST_DUE' ? 'destructive' : 'outline'}>{row.original.status}</Badge> },
    { accessorKey: 'dunningAttempts', header: 'Попыток' },
    { id: 'nextAt', header: 'Следующая попытка', cell: ({ row }) => row.original.nextDunningAt ? formatDateTime(row.original.nextDunningAt) : '—' },
    { id: 'graceUntil', header: 'Grace до', cell: ({ row }) => row.original.graceUntil ? formatDate(row.original.graceUntil) : '—' },
    { id: 'actions', header: 'Действия', cell: ({ row }) => <DunningActions sub={row.original} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild><Link href="/admin/billing">← Биллинг</Link></Button>
        <h1 className="text-2xl font-semibold">Проблемные платежи ({(subs as DunningSub[]).length})</h1>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Загрузка…</p> : (
        <DataTable columns={columns} data={subs as DunningSub[]} />
      )}
    </div>
  );
}
