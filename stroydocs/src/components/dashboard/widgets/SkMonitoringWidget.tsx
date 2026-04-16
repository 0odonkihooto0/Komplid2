'use client';

import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useSkMonitoringWidget,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  COLORS,
  formatDate,
} from './useSkMonitoringWidget';

interface Props {
  mode: 'chart' | 'table';
  objectIds?: string[];
}

export function SkMonitoringWidget({ mode, objectIds = [] }: Props) {
  const {
    skMonitoring,
    isLoading,
    selected,
    setSelected,
    selectCategory,
    selectCell,
    drillItems,
    drillLoading,
    pieData,
    totalDefects,
    totalRow,
  } = useSkMonitoringWidget({ objectIds });

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Мониторинг строительного контроля</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : skMonitoring.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет данных строительного контроля</p>
          ) : mode === 'chart' ? (
            /* Режим диаграммы: donut + легенда */
            <div className="flex items-start gap-4">
              <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                <ResponsiveContainer width={96} height={96}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      dataKey="value"
                      onClick={(_, index) => selectCategory(pieData[index]?.category ?? '')}
                      className="cursor-pointer"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'недостатков']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Общее число в центре donut */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold leading-none">{totalDefects}</span>
                </div>
              </div>
              {/* Кликабельная легенда */}
              <div className="flex-1 space-y-1 min-w-0">
                {pieData.map((entry, i) => (
                  <button
                    key={entry.category}
                    type="button"
                    onClick={() => selectCategory(entry.category)}
                    className="flex w-full items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{entry.name}</span>
                    </span>
                    <span className="ml-2 shrink-0 font-medium">{entry.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Режим таблицы: категории × колонки статусов */
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5 pr-2 font-medium text-muted-foreground">Категория</th>
                    <th className="py-1.5 px-1 font-medium text-center text-green-700">Закрыто</th>
                    <th className="py-1.5 px-1 font-medium text-center text-red-700">Активно</th>
                    <th className="py-1.5 px-1 font-medium text-center text-blue-700">Треб. проверки</th>
                    <th className="py-1.5 pl-1 font-medium text-center text-muted-foreground">Всего</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Строка итогов */}
                  <tr className="border-b-2 font-semibold">
                    <td className="py-1.5 pr-2">Итого</td>
                    <td className="py-1.5 px-1 text-center text-green-600">{totalRow.closed}</td>
                    <td className="py-1.5 px-1 text-center text-red-600">{totalRow.active}</td>
                    <td className="py-1.5 px-1 text-center text-blue-600">{totalRow.pending}</td>
                    <td className="py-1.5 pl-1 text-center">{totalRow.total}</td>
                  </tr>
                  {skMonitoring.map((row) => (
                    <tr key={row.category} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 pr-2 text-muted-foreground">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => selectCell(row.category, ['CONFIRMED'])}
                          className="text-green-600 hover:underline font-medium"
                        >
                          {row.closed}
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => selectCell(row.category, ['OPEN', 'IN_PROGRESS'])}
                          className="text-red-600 hover:underline font-medium"
                        >
                          {row.active}
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => selectCell(row.category, ['RESOLVED'])}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {row.pending}
                        </button>
                      </td>
                      <td className="py-1.5 pl-1 text-center font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно детализации по категории */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected
                ? `${CATEGORY_LABELS[selected.category] ?? selected.category} — недостатки`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {drillLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : drillItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Недостатки не найдены</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground w-8">#</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Объект</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Срок устранения</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Контроль устранения</th>
                  <th className="pb-2 font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((d, i) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/objects/${d.buildingObject.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {d.buildingObject.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {d.deadline ? formatDate(d.deadline) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {d.resolvedAt ? formatDate(d.resolvedAt) : '—'}
                    </td>
                    <td className="py-2">
                      {/* Статус-бейдж через inline span — без импорта Badge */}
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
