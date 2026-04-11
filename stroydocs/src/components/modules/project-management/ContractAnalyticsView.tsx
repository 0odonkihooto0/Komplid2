'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDateRangeFilter,
  useProjectContractAnalytics,
  formatRub,
  formatMonth,
} from './useProjectContractAnalytics';

const STATUS_COLORS: Record<string, string> = {
  'Подписан':    '#2563EB',
  'Не подписан': '#94a3b8',
  'Расторгнут':  '#ef4444',
};
const LINE_COLORS = { plan: '#2563EB', fact: '#059669' };

interface Props { objectId: string }

export function ProjectContractAnalyticsView({ objectId }: Props) {
  const { from, setFrom, to, setTo } = useDateRangeFilter();
  const { data, isLoading, isError }  = useProjectContractAnalytics(objectId, from, to);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Не удалось загрузить данные аналитики.
      </div>
    );
  }

  // Данные для виджета «план vs факт»: объединяем по месяцам
  const pvfMonths = Array.from(
    new Set([
      ...data.plannedPayments.map((p) => p.month),
      ...data.factPayments.map((p) => p.month),
    ]),
  ).sort();
  const planMap = Object.fromEntries(data.plannedPayments.map((p) => [p.month, p.cumulative]));
  const factMap = Object.fromEntries(data.factPayments.map((p)  => [p.month, p.cumulative]));
  const pvfChart = pvfMonths.map((m) => ({
    month: formatMonth(m),
    plan:  planMap[m] ?? 0,
    fact:  factMap[m] ?? 0,
  }));

  return (
    <div className="space-y-4 p-6">
      {/* Фильтр периода */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Период с</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">по</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Сетка виджетов 2×2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Виджет 1: стоимость по контрактам */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Стоимость по контрактам</CardTitle>
          </CardHeader>
          <CardContent>
            {data.costByContract.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет подписанных контрактов</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.costByContract}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}М`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatRub(v as number)} />
                  <Bar dataKey="amount" name="Сумма" fill="#2563EB" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Виджет 2: плановые платежи */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Плановые платежи</CardTitle>
          </CardHeader>
          <CardContent>
            {data.plannedPayments.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет плановых платежей за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={data.plannedPayments.map((p) => ({ month: formatMonth(p.month), amount: p.amount, cumulative: p.cumulative }))}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}М`} />
                  <Tooltip formatter={(v) => formatRub(v as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="amount"     name="За месяц"      stroke={LINE_COLORS.plan} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cumulative" name="Накопительно"   stroke="#7C3AED"         strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Виджет 3: план vs факт (накопительно) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Фактические vs Плановые (накоп.)</CardTitle>
          </CardHeader>
          <CardContent>
            {pvfChart.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет платежей за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={pvfChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}М`} />
                  <Tooltip formatter={(v) => formatRub(v as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="plan" name="План" stroke={LINE_COLORS.plan} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fact" name="Факт" stroke={LINE_COLORS.fact} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Виджет 4: статусы контрактов */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Статусы контрактов</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет контрактов</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={STATUS_COLORS[entry.status] ?? '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const item = data.statusDistribution.find((s) => s.status === String(name));
                      return [`${String(value)} (${item?.percent ?? 0}%)`, String(name)];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
