'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Hammer, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  contractsCount: number;
  workItemsCount: number;
  workRecordsCount: number;
  idFunnel: {
    workRecords: number;
    docsTotal: number;
    docsInReview: number;
    docsSigned: number;
    docsDraft: number;
    docsRejected: number;
  };
  defects: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    confirmed: number;
    overdue: number;
  };
  activityChart: { month: string; count: number }[];
}

interface Props { projectId: string }

export function ProjectStatisticsTab({ projectId }: Props) {
  const { data, isLoading } = useQuery<ProjectAnalytics>({
    queryKey: ['project-analytics', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/analytics`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Загрузка статистики...</p>;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-4">Нет данных</p>;
  }

  const { idFunnel, defects, activityChart } = data;
  const funnelItems = [
    { label: 'Записи о работах', value: idFunnel.workRecords, max: idFunnel.workRecords, color: 'bg-blue-500' },
    { label: 'Создано ИД', value: idFunnel.docsTotal, max: idFunnel.workRecords, color: 'bg-indigo-500' },
    { label: 'На согласовании', value: idFunnel.docsInReview, max: idFunnel.workRecords, color: 'bg-yellow-500' },
    { label: 'Подписано', value: idFunnel.docsSigned, max: idFunnel.workRecords, color: 'bg-green-500' },
  ];

  const kpis = [
    { label: 'Договоров', value: data.contractsCount, icon: FileText },
    { label: 'Видов работ', value: data.workItemsCount, icon: Package },
    { label: 'Записей о работах', value: data.workRecordsCount, icon: Hammer },
    { label: 'Подписано ИД', value: idFunnel.docsSigned, icon: CheckCircle2 },
    { label: 'Открытых дефектов', value: defects.open + defects.inProgress, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* KPI плашки */}
      <div className="grid gap-3 sm:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex flex-col items-center py-3 px-2 text-center">
              <kpi.icon className="mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Воронка ИД */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Воронка исполнительной документации</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelItems.map((item) => {
              const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value} <span className="text-muted-foreground">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Активность по месяцам */}
        {activityChart.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Записи о работах по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={activityChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Записей" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
