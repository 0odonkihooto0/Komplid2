'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const COLORS = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#0891b2'];

// Маппинг отображаемого источника → ключ для drill-down API
const SOURCE_KEY_MAP: Record<string, string> = {
  'Федеральный бюджет':    'federal',
  'Региональный бюджет':   'regional',
  'Местный бюджет':        'local',
  'Собственные средства':  'own',
  'Внебюджетные средства': 'extra',
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  ALLOCATED: 'План',
  DELIVERED: 'Факт',
};

function fmtAmt(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  return v.toLocaleString('ru-RU');
}

interface FundingItem { source: string; amount: number }
interface AnalyticsData { fundingPlan: FundingItem[] }
interface DrillItem {
  objectId:    string;
  objectName:  string;
  year:        number;
  recordType:  string;
  ownFunds:    number;
  extraBudget: number;
  totalAmount: number;
}

interface Props { objectIds?: string[] }

export function FundingPlanWidget({ objectIds = [] }: Props) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics-funding-plan', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<DrillItem[]>({
    queryKey: ['dashboard-funding-drill', selectedSource, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      const key = selectedSource ? (SOURCE_KEY_MAP[selectedSource] ?? '') : '';
      if (key) params.set('source', key);
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/funding-drill?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedSource,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Общий план финансирования</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-36 w-full" /></CardContent>
      </Card>
    );
  }

  const items = analytics?.fundingPlan ?? [];
  const total = items.reduce((s, r) => s + r.amount, 0);
  const pieData = items.map((r) => ({ name: r.source, value: r.amount, source: r.source }));

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Общий план финансирования</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных о финансировании</p>
          ) : (
            <div className="flex items-start gap-4">
              {/* Donut с суммой в центре */}
              <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      dataKey="value"
                      onClick={(_, index) => setSelectedSource(pieData[index]?.source ?? null)}
                      className="cursor-pointer"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [fmtAmt(v as number), 'руб.']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold leading-tight text-center">{fmtAmt(total)}</span>
                  <span className="text-[10px] text-muted-foreground">руб.</span>
                </div>
              </div>
              {/* Легенда справа */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieData.map((entry, i) => (
                  <button
                    key={entry.source}
                    type="button"
                    onClick={() => setSelectedSource(entry.source)}
                    className="flex w-full items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{entry.name}</span>
                    </span>
                    <span className="ml-2 shrink-0 font-medium tabular-nums">{fmtAmt(entry.value)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSource ?? 'Финансирование'}</DialogTitle>
          </DialogHeader>
          {drillLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : drillItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет данных</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Объект</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-2">Год</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Тип</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4 text-right">Собственные</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Заёмные</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((item, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{item.objectName}</td>
                    <td className="py-2 pr-2 tabular-nums">{item.year}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {RECORD_TYPE_LABELS[item.recordType] ?? item.recordType}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtAmt(item.ownFunds)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtAmt(item.extraBudget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
