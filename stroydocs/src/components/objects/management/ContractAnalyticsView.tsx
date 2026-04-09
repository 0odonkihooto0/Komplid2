'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import type { ContractStatus } from '@prisma/client';
import {
  useContractAnalytics, useAnalyticsFilters,
  toCumulativeAmount, toCumulativePlanVsFact,
  formatRub,
} from './useContractAnalytics';

// Цвета для секторов круговой диаграммы
const PIE_COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2'];

interface Props {
  projectId: string;
}

export function ContractAnalyticsView({ projectId }: Props) {
  const { year, setYear, cumulative, setCumulative, yearOptions } = useAnalyticsFilters();
  const { data, isLoading, isError } = useContractAnalytics(projectId, year);

  // Все хуки объявлены до условных return
  const planChart = data
    ? cumulative
      ? toCumulativeAmount(data.planPaymentsChart)
      : data.planPaymentsChart
    : [];

  const pvfChart = data
    ? cumulative
      ? toCumulativePlanVsFact(data.planVsFactChart)
      : data.planVsFactChart
    : [];

  const totalAmount = data
    ? data.contractsByCategory.reduce((s, c) => s + c.amount, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
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

  return (
    <div className="space-y-4 p-6">
      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Год" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="cumulative"
            checked={cumulative}
            onCheckedChange={setCumulative}
          />
          <Label htmlFor="cumulative" className="cursor-pointer text-sm">
            Накопительный итог
          </Label>
        </div>
      </div>

      {/* Предупреждение о просроченных КС-2 */}
      {data.overdueKs2.count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Просроченных КС-2: <strong>{data.overdueKs2.count}</strong> на сумму{' '}
            <strong>{formatRub(data.overdueKs2.totalAmount)}</strong>
          </span>
        </div>
      )}

      {/* Сетка виджетов 2×2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Виджет 1: Стоимость по видам контрактов */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Стоимость по видам контрактов</CardTitle>
          </CardHeader>
          <CardContent>
            {data.contractsByCategory.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет данных</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={160}>
                  <PieChart>
                    <Pie
                      data={data.contractsByCategory}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {data.contractsByCategory.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatRub(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">Итого</p>
                  <p className="text-sm font-semibold">{formatRub(totalAmount)}</p>
                  <div className="mt-2 space-y-1">
                    {data.contractsByCategory.map((c, idx) => (
                      <div key={c.name} className="flex items-center gap-1 text-xs">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Виджет 2: Плановые платежи по месяцам */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Плановые платежи {cumulative ? '(накопительно)' : 'по месяцам'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planChart.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет плановых платежей</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={planChart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}М`} />
                  <Tooltip formatter={(value) => formatRub(value as number)} />
                  <Bar dataKey="amount" name="Плановые" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Виджет 3: План vs Факт */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              План vs Факт {cumulative ? '(накопительно)' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pvfChart.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет данных о платежах</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={pvfChart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}М`} />
                  <Tooltip formatter={(value) => formatRub(value as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="plan" name="План" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="fact" name="Факт" fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Виджет 4: Статусы контрактов */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Статусы контрактов</CardTitle>
          </CardHeader>
          <CardContent>
            {data.contractStatuses.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет контрактов</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Статус</TableHead>
                    <TableHead className="text-right text-xs">Кол-во</TableHead>
                    <TableHead className="text-right text-xs">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contractStatuses.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell className="text-xs">
                        {CONTRACT_STATUS_LABELS[row.status as ContractStatus] ?? row.status}
                      </TableCell>
                      <TableCell className="text-right text-xs">{row.count}</TableCell>
                      <TableCell className="text-right text-xs">{formatRub(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
