'use client';

import { Card, CardContent } from '@/components/ui/card';

// Типы для отформатированных данных режима contract (из compare-formatters.ts)
interface VersionInfo {
  id: string;
  name: string;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
}

interface ContractFormatted {
  version1: VersionInfo;
  version2: VersionInfo;
  summary: { totalDiff: number; laborDiff: number; materialDiff: number };
}

const fmtRub = (v: number | null) =>
  v !== null
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)
    : '—';

const ROWS: { label: string; key: 'totalAmount' | 'totalLabor' | 'totalMat'; diffKey: 'totalDiff' | 'laborDiff' | 'materialDiff' }[] = [
  { label: 'Итого по смете', key: 'totalAmount', diffKey: 'totalDiff' },
  { label: 'Трудозатраты (ФОТ)', key: 'totalLabor', diffKey: 'laborDiff' },
  { label: 'Материалы', key: 'totalMat', diffKey: 'materialDiff' },
];

interface Props {
  formatted: unknown;
}

/** Смета контракта (с изменениями) — сводное сравнение */
export function CompareContractSummary({ formatted }: Props) {
  const data = formatted as ContractFormatted | undefined;
  if (!data?.version1 || !data?.version2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Нет данных для отображения</p>;
  }

  const { version1, version2, summary } = data;

  return (
    <div className="space-y-4">
      {/* Названия версий */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Базовая версия</p>
            <p className="mt-1 text-sm font-semibold truncate">{version1.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Текущая версия</p>
            <p className="mt-1 text-sm font-semibold truncate">{version2.name}</p>
          </CardContent>
        </Card>
        <div />
      </div>

      {/* Таблица сравнения */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left">Показатель</th>
              <th className="px-3 py-2 text-right w-36">{version1.name}</th>
              <th className="px-3 py-2 text-right w-36">{version2.name}</th>
              <th className="px-3 py-2 text-right w-36">Изменение, ₽</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key, diffKey }) => {
              const diff = summary[diffKey];
              return (
                <tr key={key} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtRub(version1[key])}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtRub(version2[key])}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}>
                    {diff >= 0 ? '+' : ''}{fmtRub(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
