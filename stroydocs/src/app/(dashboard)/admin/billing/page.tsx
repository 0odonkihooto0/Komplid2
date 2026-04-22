'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { useAdminBillingStats } from '@/hooks/useAdminBillingStats';
import { useAdminSubscriptions } from '@/hooks/useAdminBillingSubscriptions';
import { formatDate } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна', TRIALING: 'Триал', PAST_DUE: 'Просрочена',
  GRACE: 'Grace', CANCELLED: 'Отменена', EXPIRED: 'Истекла', PAUSED: 'Пауза',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default', TRIALING: 'secondary', PAST_DUE: 'destructive',
  GRACE: 'outline', CANCELLED: 'destructive', EXPIRED: 'outline', PAUSED: 'secondary',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<any>[] = [
  { accessorKey: 'workspace.organization.name', header: 'Организация', cell: ({ row }) => row.original.workspace?.organization?.name ?? row.original.workspace?.name ?? '—' },
  { accessorKey: 'workspace.owner.email', header: 'Email', cell: ({ row }) => row.original.workspace?.owner?.email ?? '—' },
  { accessorKey: 'plan.name', header: 'Тариф', cell: ({ row }) => row.original.plan?.name ?? '—' },
  { accessorKey: 'status', header: 'Статус', cell: ({ row }) => (
    <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'outline'}>
      {STATUS_LABELS[row.original.status] ?? row.original.status}
    </Badge>
  )},
  { accessorKey: 'billingPeriod', header: 'Период', cell: ({ row }) => row.original.billingPeriod === 'MONTHLY' ? 'Месяц' : 'Год' },
  { accessorKey: 'currentPeriodEnd', header: 'Конец периода', cell: ({ row }) => formatDate(row.original.currentPeriodEnd) },
];

export default function AdminBillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('ALL');
  const [billingPeriod, setBillingPeriod] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const take = 50;

  const { data: stats } = useAdminBillingStats();
  const { data: subs, isLoading } = useAdminSubscriptions({
    status: status as 'ALL',
    billingPeriod: billingPeriod as 'ALL',
    search,
    skip,
    take,
  });

  const total = subs?.meta?.total ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Биллинг</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/admin/billing/promo-codes">Промокоды</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/billing/dunning">Проблемные платежи</Link></Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'MRR', value: stats ? `${stats.mrr.toLocaleString('ru-RU')} ₽` : '…' },
          { title: 'ARR', value: stats ? `${stats.arr.toLocaleString('ru-RU')} ₽` : '…' },
          { title: 'Churn (30д)', value: stats ? `${stats.churnRate}%` : '…' },
          { title: 'Активных', value: stats?.activeCount ?? '…' },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex gap-3 flex-wrap">
        <Select value={status} onValueChange={(v) => { setStatus(v); setSkip(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            {['ALL','ACTIVE','TRIALING','PAST_DUE','GRACE','CANCELLED','EXPIRED'].map((s) => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'Все статусы' : STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={billingPeriod} onValueChange={(v) => { setBillingPeriod(v); setSkip(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Период" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все периоды</SelectItem>
            <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
            <SelectItem value="YEARLY">Ежегодно</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Поиск по org / email…" value={search} onChange={(e) => { setSearch(e.target.value); setSkip(0); }} className="max-w-xs" />
      </div>

      {/* Таблица подписок */}
      <DataTable
        columns={columns}
        data={subs?.data ?? []}
        onRowClick={(row) => router.push(`/admin/billing/${row.id}`)}
      />

      {/* Пагинация */}
      {total > take && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Всего: {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - take))}>← Назад</Button>
            <Button variant="outline" size="sm" disabled={skip + take >= total} onClick={() => setSkip(skip + take)}>Вперёд →</Button>
          </div>
        </div>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Загрузка…</p>}
    </div>
  );
}
