'use client';

import { useMemo, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3, FileText, CheckCircle, MessageSquare, Clock } from 'lucide-react';
import { useIdAnalytics } from './useIdAnalytics';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
  OPEN: 'Открыто',
  RESOLVED: 'Закрыто',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  IN_REVIEW: '#2563EB',
  SIGNED: '#22c55e',
  REJECTED: '#ef4444',
  OPEN: '#eab308',
  RESOLVED: '#22c55e',
};

// Цвет бара готовности по %
function readinessColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#eab308';
  return '#ef4444';
}

interface Props {
  objectId: string;
}

/** Аналитика ИД — 4 виджета: готовность по ГПР, статусы, авторы, замечания */
export function IdAnalyticsView({ objectId }: Props) {
  const { data, isLoading } = useIdAnalytics(objectId);

  // KPI-карточки из данных
  const kpi = useMemo(() => {
    if (!data) return { total: 0, signed: 0, inReview: 0, comments: 0 };
    const total = data.docsByStatus.reduce((s, r) => s + r.count, 0);
    const signed = data.docsByStatus.find((r) => r.status === 'SIGNED')?.count ?? 0;
    const inReview = data.docsByStatus.find((r) => r.status === 'IN_REVIEW')?.count ?? 0;
    const comments = data.commentsByStatus.reduce((s, r) => s + r.count, 0);
    return { total, signed, inReview, comments };
  }, [data]);

  // Статусы с русскими подписями для PieChart
  const statusPieData = useMemo(() => {
    if (!data) return [];
    return data.docsByStatus.map((r) => ({
      name: STATUS_LABELS[r.status] ?? r.status,
      value: r.count,
      fill: STATUS_COLORS[r.status] ?? '#94a3b8',
    }));
  }, [data]);

  // Замечания для PieChart
  const commentsPieData = useMemo(() => {
    if (!data) return [];
    return data.commentsByStatus.map((r) => ({
      name: STATUS_LABELS[r.status] ?? r.status,
      value: r.count,
      fill: STATUS_COLORS[r.status] ?? '#94a3b8',
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || kpi.total === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="Нет данных для аналитики"
        description="Создайте акты исполнительной документации, чтобы увидеть аналитику."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard icon={<FileText className="h-4 w-4" />} label="Всего ИД" value={kpi.total} />
        <KpiCard icon={<CheckCircle className="h-4 w-4 text-green-600" />} label="Подписано" value={kpi.signed} />
        <KpiCard icon={<Clock className="h-4 w-4 text-blue-600" />} label="На согласовании" value={kpi.inReview} />
        <KpiCard icon={<MessageSquare className="h-4 w-4 text-yellow-600" />} label="Замечаний" value={kpi.comments} />
      </div>

      {/* Виджет 1: Готовность ИД по разделам ГПР */}
      {data.gprReadiness.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Готовность ИД по разделам ГПР</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.gprReadiness}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stageName" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v)}%`, 'Готовность']} />
                <Bar dataKey="readinessPercent" name="Готовность" radius={[3, 3, 0, 0]}>
                  {data.gprReadiness.map((entry, idx) => (
                    <Cell key={idx} fill={readinessColor(entry.readinessPercent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Виджет 2: Статусы актов */}
        <Card>
          <CardHeader><CardTitle className="text-base">Статусы актов</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Виджет 4a: Замечания (OPEN vs RESOLVED) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Замечания</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={commentsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {commentsPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Виджет 3: ИД по авторам (stacked) */}
      {data.docsByAuthor.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">ИД по авторам</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, data.docsByAuthor.length * 40)}>
              <BarChart data={data.docsByAuthor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="userName" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="signed" name="Подписан" stackId="a" fill="#22c55e" />
                <Bar dataKey="inReview" name="На согласовании" stackId="a" fill="#2563EB" />
                <Bar dataKey="draft" name="Черновик" stackId="a" fill="#94a3b8" />
                <Bar dataKey="rejected" name="Отклонён" stackId="a" fill="#ef4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Виджет 4b: Топ-10 авторов замечаний */}
      {data.commentsByAuthor.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Топ авторов замечаний</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, data.commentsByAuthor.length * 36)}>
              <BarChart data={data.commentsByAuthor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="userName" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Замечаний" fill="#eab308" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Мини-компонент KPI-карточки
function KpiCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
