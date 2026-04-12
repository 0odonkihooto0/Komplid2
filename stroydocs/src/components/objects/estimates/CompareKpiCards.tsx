'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { VersionCompareResult } from '@/hooks/useEstimateCompare';

const formatRub = (v: number | null) =>
  v !== null
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)
    : '—';

/** Процентное изменение с обработкой деления на ноль */
function calcPct(base: number | null, diff: number): string {
  if (!base || base === 0) return 'N/A';
  const pct = (diff / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

interface Props {
  result: VersionCompareResult;
}

/** KPI-карточки сравнения двух версий сметы */
export function CompareKpiCards({ result }: Props) {
  const v1Total = result.version1.totalAmount ?? null;
  const v2Total = result.version2.totalAmount ?? null;
  const totalDiff = result.summary.totalDiff;
  const diffPositive = totalDiff > 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground truncate">{result.version1.name}</p>
          <p className="mt-1 text-base font-semibold tabular-nums">{formatRub(v1Total)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground truncate">{result.version2.name}</p>
          <p className="mt-1 text-base font-semibold tabular-nums">{formatRub(v2Total)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Разница, ₽</p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${diffPositive ? 'text-red-600' : totalDiff < 0 ? 'text-green-600' : ''}`}>
            {totalDiff >= 0 ? '+' : ''}{formatRub(totalDiff)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Изменение</p>
          <div className="mt-1 flex items-center gap-1">
            <Badge variant={diffPositive ? 'destructive' : totalDiff < 0 ? 'default' : 'outline'}>
              {calcPct(v1Total, totalDiff)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
