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

function fmtAmt(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  return v.toLocaleString('ru-RU');
}

interface PaymentItem { year: number; paid: number; planned: number }
interface AnalyticsData { contractsPayments: PaymentItem[] }
interface PaymentDrillItem {
  objectId:   string;
  objectName: string;
  paid:       number;
  planned:    number;
  deviation:  number;
}

interface Props { objectIds?: string[] }

export function ContractsPaymentDonutWidget({ objectIds = [] }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<PaymentDrillItem[]>({
    queryKey: ['dashboard-payment-drill', objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/payment-drill?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: modalOpen,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Статус оплаты (сводно)</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-36 w-full" /></CardContent>
      </Card>
    );
  }

  // Суммируем по всем годам
  const payments = analytics?.contractsPayments ?? [];
  const totalPaid    = payments.reduce((s, r) => s + r.paid, 0);
  const totalPlanned = payments.reduce((s, r) => s + r.planned, 0);
  const deviation    = Math.max(0, totalPlanned - totalPaid);

  const paidPct    = totalPlanned > 0 ? Math.round((totalPaid / totalPlanned) * 100) : 0;
  const deviPct    = 100 - paidPct;

  const pieData = [
    { name: 'Оплачено',    value: totalPaid,  color: '#2563EB' },
    { name: 'Отклонение',  value: deviation,  color: '#f97316' },
  ].filter((d) => d.value > 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Статус оплаты (сводно)</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных об оплате</p>
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
                    <span className="text-xs font-bold leading-tight text-center">{fmtAmt(totalPlanned)}</span>
                    <span className="text-[9px] text-muted-foreground">план</span>
                  </div>
                </div>
              </div>
              {/* Легенда */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-xs hover:opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563EB]" />
                  <span className="text-muted-foreground">Оплачено</span>
                  <span className="font-medium">{fmtAmt(totalPaid)} ({paidPct}%)</span>
                </button>
                <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-xs hover:opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#f97316]" />
                  <span className="text-muted-foreground">Отклонение</span>
                  <span className="font-medium">{fmtAmt(deviation)} ({deviPct}%)</span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Оплата по контрактам — по объектам</DialogTitle>
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
                  <th className="pb-2 font-medium text-muted-foreground pr-4 text-right">План</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4 text-right">Факт</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Отклонение</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((item) => (
                  <tr key={item.objectId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{item.objectName}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtAmt(item.planned)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtAmt(item.paid)}</td>
                    <td className={`py-2 text-right tabular-nums ${item.deviation > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.deviation > 0 ? `-${fmtAmt(item.deviation)}` : `+${fmtAmt(Math.abs(item.deviation))}`}
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
