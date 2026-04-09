'use client';

import { GitCompare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEstimateCompare } from '@/hooks/useEstimateCompare';
import { EstimateCompareDiffTable } from './EstimateCompareDiffTable';

const formatRub = (v: number | null) =>
  v !== null
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)
    : '—';

/** Вычисляет процентное изменение, обрабатывает деление на ноль */
function calcPct(base: number | null, diff: number): string {
  if (!base || base === 0) return 'N/A';
  const pct = (diff / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

interface Props {
  objectId: string;
}

/** Вкладка «Сравнение версий» — ШАГ 8 */
export function EstimateCompareView({ objectId }: Props) {
  const {
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,
    versions,
    versionsLoading,
    v1Id,
    setV1Id,
    v2Id,
    setV2Id,
    canCompare,
    runCompare,
    compareResult,
    compareLoading,
  } = useEstimateCompare(objectId);

  const v1Total = compareResult?.version1.totalAmount ?? null;
  const v2Total = compareResult?.version2.totalAmount ?? null;
  const totalDiff = compareResult?.summary.totalDiff ?? 0;
  const diffPositive = totalDiff > 0;

  return (
    <div className="space-y-4">
      {/* ── Панель выбора ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Договор */}
        <Select
          value={selectedContractId ?? ''}
          onValueChange={setSelectedContractId}
          disabled={contractsLoading || contracts.length === 0}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder={contractsLoading ? 'Загрузка...' : 'Договор'} />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.number ? `${c.number} — ` : ''}{c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Версия 1 */}
        <Select
          value={v1Id ?? ''}
          onValueChange={setV1Id}
          disabled={!selectedContractId || versionsLoading}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Версия 1 (база)" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id} disabled={v.id === v2Id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Версия 2 */}
        <Select
          value={v2Id ?? ''}
          onValueChange={setV2Id}
          disabled={!selectedContractId || versionsLoading}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Версия 2 (новая)" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id} disabled={v.id === v1Id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={runCompare} disabled={!canCompare || compareLoading}>
          <GitCompare className="mr-2 h-4 w-4" />
          {compareLoading ? 'Сравниваем...' : 'Сравнить'}
        </Button>
      </div>

      {/* ── Пустые состояния ───────────────────────────────────────────────── */}
      {!selectedContractId && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Выберите договор для сравнения версий смет
        </div>
      )}

      {selectedContractId && !compareResult && !compareLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <GitCompare className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Выберите две версии и нажмите <strong>Сравнить</strong>
          </p>
        </div>
      )}

      {/* ── Загрузка ───────────────────────────────────────────────────────── */}
      {compareLoading && <Skeleton className="h-64 w-full rounded-md" />}

      {/* ── Результат ──────────────────────────────────────────────────────── */}
      {compareResult && !compareLoading && (
        <>
          {/* KPI карточки */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground truncate">{compareResult.version1.name}</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{formatRub(v1Total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground truncate">{compareResult.version2.name}</p>
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

          {/* Таблица диффа */}
          <EstimateCompareDiffTable result={compareResult} />
        </>
      )}
    </div>
  );
}
