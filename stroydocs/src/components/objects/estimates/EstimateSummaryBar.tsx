'use client';

import type { EstimateVersionItem } from '@/hooks/useEstimateVersions';

const formatRub = (amount: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);

interface Props {
  versions: EstimateVersionItem[];
}

/** Суммарные показатели по всем версиям смет (аналог ЦУС) */
export function EstimateSummaryBar({ versions }: Props) {
  // Суммы по всем версиям выбранного договора
  const totalBase = versions.reduce((sum, v) => sum + (v.totalAmount ?? 0), 0);
  const totalWithoutDz = versions.reduce(
    (sum, v) => sum + (v.totalLabor ?? 0) + (v.totalMat ?? 0),
    0,
  );
  const totalCurrent = totalBase; // Текущие цены = базовые + ДЗ (ДЗ пока не разделены)

  const items = [
    { label: 'Суммарно в базовых ценах', value: totalBase },
    { label: 'в текущих без ДЗ', value: totalWithoutDz },
    { label: 'в текущих', value: totalCurrent },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      {items.map((item, idx) => (
        <span key={item.label} className="whitespace-nowrap">
          {idx > 0 && <span className="mr-4 text-muted-foreground">|</span>}
          <span className="text-muted-foreground">{item.label}:</span>{' '}
          <span className="font-semibold tabular-nums">{formatRub(item.value)}</span>
        </span>
      ))}
    </div>
  );
}
