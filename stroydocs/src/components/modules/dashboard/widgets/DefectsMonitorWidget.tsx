'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface GlobalData {
  defectsOpen: number;
  defectsTotal: number;
  projects: { id: string; name: string; defectsCount: number; overdueDefects: number }[];
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#94a3b8'];

export function DefectsMonitorWidget() {
  const { data, isLoading } = useQuery<GlobalData>({
    queryKey: ['analytics-global'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/global');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Дефектовка</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Топ-5 проектов по дефектам
  const topProjects = [...data.projects]
    .sort((a, b) => b.defectsCount - a.defectsCount)
    .slice(0, 5);

  const pieData = topProjects.map((p) => ({ name: p.name, value: p.defectsCount }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Дефекты по проектам</CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Дефектов не зафиксировано</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'дефектов']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {topProjects.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate max-w-24 text-muted-foreground">{p.name}</span>
                  </span>
                  <span className="font-medium">{p.defectsCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Всего открытых: <strong className="text-foreground">{data.defectsOpen}</strong>
        </p>
      </CardContent>
    </Card>
  );
}
