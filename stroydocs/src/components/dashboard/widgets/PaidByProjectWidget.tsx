'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function fmtAmt(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} млрд`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  return v.toLocaleString('ru-RU');
}

interface PaymentItem   { year: number; paid: number; planned: number }
interface FinancingItem { year: number; plan: number; fact:    number }
interface FundingSource { source: string; amount: number }
interface AnalyticsData {
  contractsPayments: PaymentItem[];
  financingByYear:   FinancingItem[];
  fundingFact:       FundingSource[];
}

interface Props { objectIds?: string[] }

export function PaidByProjectWidget({ objectIds = [] }: Props) {
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

  // Объединяем данные contractsPayments (paid) и financingByYear (plan) по году
  const payments   = analytics?.contractsPayments ?? [];
  const financing  = analytics?.financingByYear   ?? [];
  const fundFact   = analytics?.fundingFact       ?? [];

  const ownFunds   = fundFact.find((f) => f.source === 'Собственные средства')?.amount ?? 0;
  const extraFunds = fundFact.find((f) => f.source === 'Внебюджетные средства')?.amount ?? 0;

  const allYears = Array.from(new Set([
    ...payments.map((p) => p.year),
    ...financing.map((f) => f.year),
  ])).sort();

  const chartData = allYears.map((year) => {
    const p = payments.find((x) => x.year === year);
    const f = financing.find((x) => x.year === year);
    return {
      year:    String(year),
      paid:    p?.paid ?? 0,
      planFin: f?.plan ?? 0,
    };
  });

  // Tooltip кастомный: Оплачено + Заёмные + Собственные + План
  const totalPaid = payments.reduce((s, r) => s + r.paid, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Оплачено по проекту</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет данных об оплате</p>
        ) : (
          <div className="space-y-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 10 }} width={60} />
                <Tooltip
                  formatter={(v, name) => [
                    fmtAmt(v as number),
                    name === 'paid' ? 'Оплачено по контрактам' : 'План финансирования',
                  ]}
                />
                <Legend
                  formatter={(value) => value === 'paid' ? 'Оплачено по контрактам' : 'План финансирования'}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="paid"    name="paid"    fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="planFin" name="planFin" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Сводка: собственные и заёмные из факт-финансирования */}
            {(ownFunds > 0 || extraFunds > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
                <span>Итого оплачено: <strong className="text-foreground">{fmtAmt(totalPaid)}</strong></span>
                {ownFunds  > 0 && <span>Собственные: <strong className="text-foreground">{fmtAmt(ownFunds)}</strong></span>}
                {extraFunds > 0 && <span>Заёмные: <strong className="text-foreground">{fmtAmt(extraFunds)}</strong></span>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
