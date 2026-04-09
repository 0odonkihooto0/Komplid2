'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  contractsCount: number;
  defectsCount: number;
  overdueDefects: number;
  signedDocsCount: number;
  totalDocsCount: number;
}

interface GlobalData {
  projectsCount: number;
  contractsCount: number;
  docsTotal: number;
  docsSigned: number;
  defectsOpen: number;
  defectsTotal: number;
  projects: ProjectSummary[];
  workRecordsByMonth: { month: string; count: number }[];
  defectsByCategory: { category: string; count: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

function formatMonth(ym: string) {
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

export function GlobalAnalyticsContent() {
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

  const kpis = [
    { label: 'Проектов', value: data?.projectsCount ?? 0, icon: FolderOpen },
    { label: 'Договоров', value: data?.contractsCount ?? 0, icon: FileText },
    { label: 'Подписано ИД', value: data?.docsSigned ?? 0, icon: CheckCircle2 },
    { label: 'Открытых дефектов', value: data?.defectsOpen ?? 0, icon: AlertTriangle },
  ];

  const workRecordsChartData = (data?.workRecordsByMonth ?? []).map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  const defectsCategoryData = (data?.defectsByCategory ?? []).map((d) => ({
    name: CATEGORY_LABELS[d.category] ?? d.category,
    value: d.count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Глобальная аналитика"
        description="Мониторинг всех объектов организации"
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Тепловая карта проектов */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Тепловая карта проектов
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.projects ?? []).map((project) => {
              const hasOverdue = project.overdueDefects > 0;
              const hasDefects = project.defectsCount > 0;

              // Цветовая индикация: красный → жёлтый → зелёный
              const cardClass = cn(
                'cursor-pointer transition-colors hover:opacity-90',
                hasOverdue
                  ? 'border-red-300 bg-red-50/40'
                  : hasDefects
                  ? 'border-yellow-300 bg-yellow-50/40'
                  : 'border-green-200 bg-green-50/30',
              );

              return (
                <Link key={project.id} href={`/objects/${project.id}`}>
                  <Card className={cardClass}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium leading-tight">
                          {project.name}
                        </CardTitle>
                        <Badge
                          variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="flex-shrink-0 text-xs"
                        >
                          {STATUS_LABEL[project.status] ?? project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 pb-3">
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          Договоров: <strong className="text-foreground">{project.contractsCount}</strong>
                        </span>
                        <span>
                          Подписано ИД: <strong className="text-foreground">{project.signedDocsCount}</strong>
                          {project.totalDocsCount > 0 && `/${project.totalDocsCount}`}
                        </span>
                      </div>
                      {hasDefects && (
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className={cn(hasOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                            Открытых дефектов: <strong>{project.defectsCount}</strong>
                          </span>
                          {hasOverdue && (
                            <span className="font-bold text-destructive">
                              Просрочено: {project.overdueDefects}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Графики */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* BarChart — активность СМР по месяцам */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Активность СМР (последние 6 мес.)</CardTitle>
          </CardHeader>
          <CardContent>
            {workRecordsChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных о записях работ.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workRecordsChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value, 'Записей']}
                    labelFormatter={(l) => `Месяц: ${l}`}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* PieChart — дефекты по категориям */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Дефекты по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {defectsCategoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Дефекты отсутствуют.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={defectsCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {defectsCategoryData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
