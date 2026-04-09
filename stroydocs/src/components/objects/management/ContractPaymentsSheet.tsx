'use client';

import { useState } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/utils/format';
import { useContractPayments } from './useContractPayments';
import { AddPaymentDialog } from './AddPaymentDialog';
import type { MgmtContractItem } from './useManagementContracts';

interface Props {
  contract: MgmtContractItem | null;
  projectId: string;
  onClose: () => void;
}

const PAYMENT_TYPE_LABEL: Record<'PLAN' | 'FACT', string> = {
  PLAN: 'Плановый',
  FACT: 'Фактический',
};

export function ContractPaymentsSheet({ contract, projectId, onClose }: Props) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const { payments, isLoading, addMutation, deleteMutation, totalPlan, totalFact } =
    useContractPayments(projectId, contract?.id ?? '');

  function handleDelete(paymentId: string) {
    deleteMutation.mutate(paymentId, {
      onError: (err: Error) =>
        toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
    });
  }

  if (!contract) return null;

  return (
    <>
      {/* Затемнение фона */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Правая панель */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-xl">
        {/* Заголовок */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{contract.number}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{contract.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1 opacity-70 hover:opacity-100"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Контент с прокруткой */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">График платежей</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить платёж
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Платежи не добавлены
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Тип</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Сумма</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Дата</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Источник</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Описание</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Badge
                          variant={p.paymentType === 'PLAN' ? 'outline' : 'default'}
                          className="text-xs"
                        >
                          {PAYMENT_TYPE_LABEL[p.paymentType]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.budgetType ?? '—'}</td>
                      <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                        {p.description ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          aria-label="Удалить платёж"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Итоговые суммы */}
          {payments.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="flex gap-6 text-sm">
                <span className="text-muted-foreground">
                  Итого план:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(totalPlan)}</span>
                </span>
                <span className="text-muted-foreground">
                  Итого факт:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(totalFact)}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <AddPaymentDialog open={addOpen} onOpenChange={setAddOpen} addMutation={addMutation} />
    </>
  );
}
