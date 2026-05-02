'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';

interface AnalyticsData {
  viewCount: number;
  uniqueVisitors: number;
  viewsByDay: Array<{ date: string; count: number }>;
  topReferers: Array<{ referer: string; count: number }>;
}

function usePortalAnalytics(objectId: string) {
  return useQuery({
    queryKey: ['portal-analytics', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/publicity/analytics`);
      if (!res.ok) throw new Error('Ошибка загрузки аналитики');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as AnalyticsData;
    },
  });
}

interface PublicityAnalyticsProps {
  objectId: string;
}

// Аналитика просмотров публичного дашборда объекта
export function PublicityAnalytics({ objectId }: PublicityAnalyticsProps) {
  const { data, isLoading } = usePortalAnalytics(objectId);

  if (isLoading) return <div className="animate-pulse h-48 rounded-xl bg-muted" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-5 w-5 text-primary" />
            Аналитика просмотров
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Сводка */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{data.viewCount}</p>
              <p className="text-xs text-muted-foreground">Всего просмотров</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold">{data.uniqueVisitors}</p>
              <p className="text-xs text-muted-foreground">Уникальных посетителей</p>
            </div>
          </div>

          {/* График по дням */}
          {data.viewsByDay.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Просмотры за 30 дней</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.viewsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: number) => [val, 'Просмотров']}
                    labelFormatter={(l: string) => `Дата: ${l}`}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Топ источников */}
          {data.topReferers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Топ источников переходов</p>
              <div className="space-y-1">
                {data.topReferers.map((r) => (
                  <div key={r.referer} className="flex justify-between text-sm">
                    <span className="truncate text-muted-foreground max-w-[75%]">{r.referer}</span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
