'use client';

// Типы для отформатированных данных режима cost (из compare-formatters.ts)
interface DeltaPair {
  v1: number;
  v2: number;
  delta: number;
}

interface CostFormatted {
  costElements: {
    labor: DeltaPair;
    material: DeltaPair;
    machinery: DeltaPair;
    other: DeltaPair;
  };
}

const fmtRub = (v: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

/** Расчёт процентного изменения */
function pct(base: number, delta: number): string {
  if (base === 0) return 'N/A';
  const p = (delta / base) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

const COST_LABELS: { key: keyof CostFormatted['costElements']; label: string }[] = [
  { key: 'labor', label: 'Строительные работы (СР)' },
  { key: 'material', label: 'Материалы (МР)' },
  { key: 'machinery', label: 'Оборудование' },
  { key: 'other', label: 'Прочие затраты' },
];

interface Props {
  formatted: unknown;
}

/** Сопоставительная ведомость изменения сметной стоимости */
export function CompareCostTable({ formatted }: Props) {
  const data = formatted as CostFormatted | undefined;
  if (!data?.costElements) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Нет данных для отображения</p>;
  }

  const { costElements } = data;

  // Итоговая строка
  const totalV1 = COST_LABELS.reduce((s, { key }) => s + costElements[key].v1, 0);
  const totalV2 = COST_LABELS.reduce((s, { key }) => s + costElements[key].v2, 0);
  const totalDelta = totalV2 - totalV1;

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left">Элемент затрат</th>
            <th className="px-3 py-2 text-right w-32">Версия 1, ₽</th>
            <th className="px-3 py-2 text-right w-32">Версия 2, ₽</th>
            <th className="px-3 py-2 text-right w-28">Δ, ₽</th>
            <th className="px-3 py-2 text-right w-20">Δ%</th>
          </tr>
        </thead>
        <tbody>
          {COST_LABELS.map(({ key, label }) => {
            const el = costElements[key];
            return (
              <tr key={key} className="border-b">
                <td className="px-3 py-2 font-medium">{label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtRub(el.v1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtRub(el.v2)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${el.delta > 0 ? 'text-red-600' : el.delta < 0 ? 'text-green-600' : ''}`}>
                  {el.delta >= 0 ? '+' : ''}{fmtRub(el.delta)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${el.delta > 0 ? 'text-red-600' : el.delta < 0 ? 'text-green-600' : ''}`}>
                  {pct(el.v1, el.delta)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-2">Итого</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtRub(totalV1)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtRub(totalV2)}</td>
            <td className={`px-3 py-2 text-right tabular-nums ${totalDelta > 0 ? 'text-red-600' : totalDelta < 0 ? 'text-green-600' : ''}`}>
              {totalDelta >= 0 ? '+' : ''}{fmtRub(totalDelta)}
            </td>
            <td className={`px-3 py-2 text-right tabular-nums ${totalDelta > 0 ? 'text-red-600' : totalDelta < 0 ? 'text-green-600' : ''}`}>
              {pct(totalV1, totalDelta)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
