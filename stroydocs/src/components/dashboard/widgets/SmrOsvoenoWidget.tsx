'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function fmtAmt(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  return v.toLocaleString('ru-RU');
}

interface SmrOsvoenoData { done: number; total: number; remainder: number }
interface AnalyticsData { smrContractsOsvoeno: SmrOsvoenoData }
interface SmrDrillItem {
  objectId:   string;
  objectName: string;
  smrCost:    number;
  total:      number;
  remainder:  number;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Props { objectIds?: string[] }

export function SmrOsvoenoWidget({ objectIds = [] }: Props) {
  const [selectedYear, setSelectedYear]   = useState<number>(currentYear);
  const [modalOpen,    setModalOpen]      = useState(false);

  const idsParam  = objectIds.map((id) => `objectIds[]=${id}`).join('&');
  const yearParam = `year=${selectedYear}`;
  const queryStr  = [yearParam, idsParam].filter(Boolean).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics-smr-osvoeno', selectedYear, objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics?${queryStr}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<SmrDrillItem[]>({
    queryKey: ['dashboard-smr-drill', selectedYear, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(selectedYear) });
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/smr-drill?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: modalOpen,
    staleTime: 2 * 60 * 1000,
  });

  const osvoeno = analytics?.smrContractsOsvoeno;
  const done      = osvoeno?.done      ?? 0;
  const total     = osvoeno?.total     ?? 0;
  const remainder = osvoeno?.remainder ?? 0;

  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pieData = [
    { name: 'Выполнено работ', value: done,      color: '#2563EB' },
    { name: 'Остаток',         value: Math.max(0, remainder), color: '#e5e7eb' },
  ].filter((d) => d.value > 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Освоено по контрактам, СМР</CardTitle>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger className="h-6 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : total === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных за {selectedYear} год</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="relative" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        dataKey="value"
                        onClick={() => setModalOpen(true)}
                        className="cursor-pointer"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [fmtAmt(v as number), 'руб.']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold leading-tight text-center">{fmtAmt(total)}</span>
                    <span className="text-[9px] text-muted-foreground">план СМР</span>
                  </div>
                </div>
              </div>
              {/* Легенда */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-xs hover:opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563EB]" />
                  <span className="text-muted-foreground">Выполнено</span>
                  <span className="font-medium">{fmtAmt(done)} ({donePct}%)</span>
                </button>
                <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-xs hover:opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-200" />
                  <span className="text-muted-foreground">Остаток</span>
                  <span className="font-medium">{fmtAmt(Math.max(0, remainder))}</span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Освоено по СМР — {selectedYear} год</DialogTitle>
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
                  <th className="pb-2 font-medium text-muted-foreground pr-4 text-right">Выполнено СМР</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4 text-right">План</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Остаток</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((item) => (
                  <tr key={item.objectId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{item.objectName}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtAmt(item.smrCost)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtAmt(item.total)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtAmt(Math.max(0, item.remainder))}</td>
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
