'use client';

import { useState, useMemo } from 'react';
import { Trash2, Plus, Wallet, TrendingDown, PiggyBank } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/utils/format';
import { useIndicators } from '../indicators/useIndicators';
import { useFunding, FUNDING_TYPE_LABELS, type FundingSource } from './useFunding';
import { AddFundingDialog } from './AddFundingDialog';

interface FundingViewProps {
  projectId: string;
}

export function FundingView({ projectId }: FundingViewProps) {
  const { sources, isLoading, createMutation, deleteMutation } = useFunding(projectId);
  const { indicators } = useIndicators(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Лимит — сумма всех источников
  const totalLimit = useMemo(
    () => sources.reduce((sum, s) => sum + s.amount, 0),
    [sources]
  );
  const spent = indicators?.totalKs2Amount ?? 0;
  const remaining = totalLimit - spent;

  const columns: ColumnDef<FundingSource, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: 'Тип',
        cell: ({ getValue }) => (
          <Badge variant="outline">{FUNDING_TYPE_LABELS[getValue() as FundingSource['type']]}</Badge>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Источник',
      },
      {
        accessorKey: 'period',
        header: 'Период',
        cell: ({ getValue }) => (getValue() as string | null) ?? '—',
      },
      {
        accessorKey: 'amount',
        header: 'Сумма',
        cell: ({ getValue }) => formatCurrency(getValue() as number),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Финансирование</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить источник
        </Button>
      </div>

      {/* 3 summary карточки */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Лимит финансирования</p>
              <p className="text-lg font-semibold">{formatCurrency(totalLimit)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Освоено (КС-2)</p>
              <p className="text-lg font-semibold">{formatCurrency(spent)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${remaining >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Остаток</p>
              <p className={`text-lg font-semibold ${remaining < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица источников */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Источники финансирования</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={sources} searchPlaceholder="Поиск..." searchColumn="name" />
        </CardContent>
      </Card>

      <AddFundingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
        }}
      />
    </div>
  );
}
