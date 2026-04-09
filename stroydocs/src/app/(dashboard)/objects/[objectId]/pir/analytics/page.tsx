'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

const PIE_COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2'];

const DOC_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  IN_PROGRESS: 'В работе',
  SENT_FOR_REVIEW: 'На проверке',
  IN_APPROVAL: 'На согласовании',
  APPROVED: 'Согласован',
  CANCELLED: 'Аннулирован',
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'На согласовании',
  APPROVED: 'Согласован',
  REJECTED: 'Отклонён',
};

const COMMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активные',
  ANSWERED: 'С ответом',
  CLOSED: 'Закрытые',
};

const COMMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#DC2626',
  ANSWERED: '#D97706',
  CLOSED: '#059669',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  DESIGN_PD: 'ПД',
  WORKING_RD: 'РД',
  SURVEY: 'Изыскания',
  REPEATED_USE: 'Повт. применение',
};

interface PIRAnalyticsData {
  docsByStatus: { status: string; count: number }[];
  docsByApprovalStatus: { status: string; count: number }[];
  commentsByStatus: { status: string; count: number }[];
  docsByType: { docType: string; count: number }[];
  topAuthors: { user: { id: string; firstName: string; lastName: string } | null; count: number }[];
  topAssignees: { user: { id: string; firstName: string; lastName: string } | null; count: number }[];
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="py-8 text-center text-xs text-muted-foreground">Нет данных</p>
  );
}

export default function PIRAnalyticsPage({
  params,
}: {
  params: { objectId: string };
}) {
  const { data, isLoading, isError } = useQuery<PIRAnalyticsData>({
    queryKey: ['pir-analytics', params.objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${params.objectId}/pir-analytics`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      return json.data as PIRAnalyticsData;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Все производные данные объявлены до условных return (Rules of Hooks)
  const docsByStatusChart = (data?.docsByStatus ?? []).map((r) => ({
    name: DOC_STATUS_LABELS[r.status] ?? r.status,
    value: r.count,
  }));

  const docsByApprovalChart = (data?.docsByApprovalStatus ?? []).map((r) => ({
    name: APPROVAL_STATUS_LABELS[r.status] ?? r.status,
    value: r.count,
  }));

  const commentsByStatusChart = (data?.commentsByStatus ?? []).map((r) => ({
    name: COMMENT_STATUS_LABELS[r.status] ?? r.status,
    value: r.count,
    fill: COMMENT_STATUS_COLORS[r.status] ?? '#2563EB',
  }));

  const docsByTypeChart = (data?.docsByType ?? []).map((r) => ({
    name: DOC_TYPE_LABELS[r.docType] ?? r.docType,
    value: r.count,
  }));

  const topAuthorsChart = (data?.topAuthors ?? []).map((r) => ({
    name: r.user ? `${r.user.lastName} ${r.user.firstName}`.trim() : 'Неизвестно',
    count: r.count,
  }));

  const topAssigneesChart = (data?.topAssignees ?? []).map((r) => ({
    name: r.user ? `${r.user.lastName} ${r.user.firstName}`.trim() : 'Неизвестно',
    count: r.count,
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Не удалось загрузить данные аналитики.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

      {/* Виджет 1: PieChart — документы по статусам */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Документы по статусам</CardTitle>
        </CardHeader>
        <CardContent>
          {docsByStatusChart.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={140}>
                <PieChart>
                  <Pie
                    data={docsByStatusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={35}
                  >
                    {docsByStatusChart.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {docsByStatusChart.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Виджет 2: PieChart — статусы согласования */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Статусы согласования</CardTitle>
        </CardHeader>
        <CardContent>
          {docsByApprovalChart.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={140}>
                <PieChart>
                  <Pie
                    data={docsByApprovalChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={35}
                  >
                    {docsByApprovalChart.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {docsByApprovalChart.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Виджет 3: BarChart — замечания по статусам (активные / с ответом / закрытые) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Замечания по статусам</CardTitle>
        </CardHeader>
        <CardContent>
          {commentsByStatusChart.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={commentsByStatusChart}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Замечаний" radius={[3, 3, 0, 0]}>
                  {commentsByStatusChart.map((item, idx) => (
                    <Cell key={idx} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Виджет 4: PieChart — типы документов */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Документы по типам</CardTitle>
        </CardHeader>
        <CardContent>
          {docsByTypeChart.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={140}>
                <PieChart>
                  <Pie
                    data={docsByTypeChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={35}
                  >
                    {docsByTypeChart.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {docsByTypeChart.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Виджет 5: BarChart горизонтальный — топ-10 авторов замечаний */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Авторы замечаний (топ-10)</CardTitle>
        </CardHeader>
        <CardContent>
          {topAuthorsChart.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                layout="vertical"
                data={topAuthorsChart}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={90}
                />
                <Tooltip />
                <Bar dataKey="count" name="Замечаний" fill="#2563EB" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Виджет 6: BarChart горизонтальный — топ-10 ответственных */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ответственные за устранение (топ-10)</CardTitle>
        </CardHeader>
        <CardContent>
          {topAssigneesChart.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                layout="vertical"
                data={topAssigneesChart}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={90}
                />
                <Tooltip />
                <Bar dataKey="count" name="Замечаний" fill="#7C3AED" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
