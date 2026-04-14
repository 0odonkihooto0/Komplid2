'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useKs2AdditionalCosts } from './useKs2';
import type { Ks2AdditionalCost } from './useKs2';

const COST_TYPE_LABELS: Record<string, string> = {
  ACCRUAL_BY_WORK_TYPE: 'Начисление по видам работ',
  ACCRUAL_TO_TOTALS: 'Начисление на итоги',
  TEMP_BUILDINGS: 'Временные здания',
  WINTER_MARKUP: 'Зимнее удорожание',
  ADDITIONAL_CURRENT_PRICES: 'Доп. затраты в текущих ценах',
  DEFLATOR_INDEX: 'Индекс-дефлятор',
  MINUS_CUSTOMER_RESOURCES: 'Минус ресурсы заказчика',
  VAT: 'НДС',
};

const CALC_METHOD_LABELS: Record<string, string> = {
  COEFFICIENT: 'Коэффициент',
  PERCENT: 'Процент',
  FIXED_SUM: 'Фиксированная сумма',
};

interface Props {
  projectId: string;
  contractId: string;
  ks2Id: string;
  totalItemsAmount: number;
}

/** Вкладка «ДЗ сметы» — допзатраты из смет договора */
export function Ks2AdditionalCostsTab({ projectId, contractId, ks2Id, totalItemsAmount }: Props) {
  const { costs, isLoading, updateExcludedMutation } = useKs2AdditionalCosts(projectId, contractId, ks2Id);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (costs.length === 0) {
    return (
      <div className="rounded-md border bg-muted/50 py-8 text-center text-sm text-muted-foreground">
        Нет допзатрат в сметах этого договора.
      </div>
    );
  }

  function handleToggle(cost: Ks2AdditionalCost) {
    const currentExcluded = costs.filter((c) => c.isExcluded).map((c) => c.id);
    let newExcluded: string[];
    if (cost.isExcluded) {
      newExcluded = currentExcluded.filter((id) => id !== cost.id);
    } else {
      newExcluded = [...currentExcluded, cost.id];
    }
    updateExcludedMutation.mutate(newExcluded);
  }

  const includedCount = costs.filter((c) => !c.isExcluded).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Всего начислений: {costs.length}</span>
        <span>Включено: {includedCount}</span>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2 text-center font-medium">&#10003;</th>
              <th className="px-3 py-2 text-left font-medium">Наименование</th>
              <th className="px-3 py-2 text-left font-medium">Тип</th>
              <th className="px-3 py-2 text-left font-medium">Метод</th>
              <th className="px-3 py-2 text-right font-medium">Значение</th>
              <th className="px-3 py-2 text-center font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost) => (
              <tr key={cost.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 text-center">
                  <Checkbox
                    checked={!cost.isExcluded}
                    disabled={updateExcludedMutation.isPending}
                    onCheckedChange={() => handleToggle(cost)}
                  />
                </td>
                <td className="px-3 py-2">{cost.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {COST_TYPE_LABELS[cost.costType] ?? cost.costType}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {CALC_METHOD_LABELS[cost.calculationMethod] ?? cost.calculationMethod}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {cost.value ?? '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {cost.isExcluded ? (
                    <Badge variant="outline" className="text-muted-foreground">Исключено</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">Включено</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-right text-sm text-muted-foreground">
        База (позиции КС-2): <strong>{totalItemsAmount.toLocaleString('ru-RU')} руб.</strong>
      </p>
    </div>
  );
}
