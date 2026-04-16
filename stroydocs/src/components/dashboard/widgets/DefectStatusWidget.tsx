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

const STATUS_LABELS: Record<string, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

const STATUS_COLORS_BADGE: Record<string, string> = {
  OPEN:        'bg-red-100 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  RESOLVED:    'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED:   'bg-green-100 text-green-700 border-green-200',
  REJECTED:    'bg-gray-100 text-gray-700 border-gray-200',
};

const COLORS = ['#ef4444', '#f59e0b', '#2563EB', '#059669', '#64748b'];

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface DefectStatusItem { status: string; count: number }
interface AnalyticsData { defectsByStatus: DefectStatusItem[] }
interface DrillDefect {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  resolvedAt: string | null;
  buildingObject: { id: string; name: string };
}

interface Props { objectIds?: string[] }

export function DefectStatusWidget({ objectIds = [] }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics-defect-status', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<DrillDefect[]>({
    queryKey: ['dashboard-defect-status-drill', selectedStatus, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status[]', selectedStatus);
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/sk-drill?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedStatus,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Недостатки</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-36 w-full" /></CardContent>
      </Card>
    );
  }

  const items = analytics?.defectsByStatus ?? [];
  const total = items.reduce((s, r) => s + r.count, 0);
  const pieData = items.map((r) => ({ name: STATUS_LABELS[r.status] ?? r.status, value: r.count, status: r.status }));

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Недостатки</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных о недостатках</p>
          ) : (
            <div className="space-y-3">
              {/* Donut с числом в центре */}
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
                        onClick={(_, index) => setSelectedStatus(pieData[index]?.status ?? null)}
                        className="cursor-pointer"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'недостатков']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold leading-none">{total}</span>
                    <span className="text-[10px] text-muted-foreground">всего</span>
                  </div>
                </div>
              </div>
              {/* Легенда снизу */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {pieData.map((entry, i) => (
                  <button
                    key={entry.status}
                    type="button"
                    onClick={() => setSelectedStatus(entry.status)}
                    className="flex items-center gap-1 text-xs hover:opacity-80"
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium">{entry.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedStatus} onOpenChange={(open) => !open && setSelectedStatus(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStatus ? `Недостатки — ${STATUS_LABELS[selectedStatus] ?? selectedStatus}` : ''}
            </DialogTitle>
          </DialogHeader>
          {drillLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : drillItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Недостатки не найдены</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 w-8 font-medium text-muted-foreground">#</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Объект</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Описание</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Срок</th>
                  <th className="pb-2 font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((d, i) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-primary whitespace-nowrap">{d.buildingObject.name}</td>
                    <td className="py-2 pr-4 max-w-xs truncate">{d.title}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {d.deadline ? fmtDate(d.deadline) : '—'}
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS_BADGE[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
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
