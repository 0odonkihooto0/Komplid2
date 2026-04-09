'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useGanttTasks } from './useGanttTasks';
import { calculatePlannedProgress, calculateActualProgress } from '@/lib/gantt/converters';
import { formatDate } from '@/utils/format';

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начата',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  DELAYED: 'Задержка',
  ON_HOLD: 'Приостановлена',
};

interface Props {
  projectId: string;
  contractId: string;
  versionId: string;
}

export function GanttAnalytics({ projectId, contractId, versionId }: Props) {
  const { data, isLoading } = useGanttTasks(projectId, contractId, versionId);
  const tasks = data.tasks;
  const today = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    const leaves = tasks.filter((t) => !tasks.some((o) => o.parentId === t.id));
    const total = leaves.length;
    const completed = leaves.filter((t) => t.progress >= 100).length;
    const delayed = leaves.filter(
      (t) => new Date(t.planEnd) < today && t.progress < 100,
    ).length;
    const criticalCount = leaves.filter((t) => t.isCritical).length;

    const avgProgress =
      total > 0 ? Math.round(leaves.reduce((s, t) => s + t.progress, 0) / total) : 0;

    // Прогноз завершения: линейная экстраполяция от текущего прогресса
    let forecastDate: Date | null = null;
    if (avgProgress > 0 && avgProgress < 100 && total > 0) {
      const startDates = leaves.map((t) => new Date(t.planStart).getTime());
      const projectStart = new Date(Math.min(...startDates));
      const elapsedDays = (today.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000);
      const daysNeeded = (elapsedDays / avgProgress) * 100;
      forecastDate = new Date(projectStart.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
    }

    return { total, completed, delayed, criticalCount, avgProgress, forecastDate };
  }, [tasks, today]);

  // S-кривая данных по неделям
  const sCurveData = useMemo(() => {
    if (tasks.length === 0) return [];
    const leaves = tasks.filter((t) => !tasks.some((o) => o.parentId === t.id));
    if (leaves.length === 0) return [];

    const starts = leaves.map((t) => new Date(t.planStart).getTime());
    const ends = leaves.map((t) => new Date(t.planEnd).getTime());
    const projectStart = new Date(Math.min(...starts));
    const projectEnd = new Date(Math.max(...ends));

    const weeks: Date[] = [];
    const cur = new Date(projectStart);
    while (cur <= projectEnd) {
      weeks.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
    if (weeks[weeks.length - 1] < projectEnd) weeks.push(projectEnd);

    return weeks.map((d) => ({
      date: formatDate(d),
      plan: calculatePlannedProgress(tasks, d),
      fact: d <= today ? calculateActualProgress(tasks, d) : null,
    }));
  }, [tasks, today]);

  // Статусная гистограмма
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      count,
    }));
  }, [tasks]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Общий прогресс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgProgress}%</p>
            <p className="text-xs text-muted-foreground">{stats.completed} / {stats.total} задач</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Задержки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats.delayed}</p>
            <p className="text-xs text-muted-foreground">задач просрочено</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Критический путь
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.criticalCount}</p>
            <p className="text-xs text-muted-foreground">задач на КП</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Прогноз
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {stats.forecastDate
                ? formatDate(stats.forecastDate)
                : stats.avgProgress >= 100
                  ? '✓ Завершён'
                  : '—'}
            </p>
            <p className="text-xs text-muted-foreground">дата завершения</p>
          </CardContent>
        </Card>
      </div>

      {/* S-кривая */}
      {sCurveData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">S-кривая прогресса</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={sCurveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="plan"
                  name="План"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fact"
                  name="Факт"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Статусная гистограмма */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Распределение по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Задач" fill="#2563EB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
