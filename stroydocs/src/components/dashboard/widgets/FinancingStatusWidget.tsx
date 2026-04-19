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

interface FinancingItem { year: number; plan: number; fact: number }
interface AnalyticsData { financingByYear: FinancingItem[] }

interface Props { objectIds?: string[] }

export function FinancingStatusWidget({ objectIds = [] }: Props) {
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

  const chartData = (analytics?.financingByYear ?? []).map((r) => ({
    year: String(r.year),
    fact: r.fact,
    plan: r.plan,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Статус по финансированию</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет данных о финансировании</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 10 }} width={60} />
              <Tooltip
                formatter={(v, name) => [
                  fmtAmt(v as number),
                  name === 'fact' ? 'Факт финансирования' : 'План финансирования',
                ]}
              />
              <Legend
                formatter={(value) => value === 'fact' ? 'Факт финансирования' : 'План финансирования'}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="fact" name="fact" fill="#2563EB" radius={[3, 3, 0, 0]} />
              <Bar dataKey="plan" name="plan" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
