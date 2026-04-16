'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface IssueTypeStat {
  type: string;
  count: number;
}

interface AnalyticsData {
  issuesByType: IssueTypeStat[];
}

interface IssueDrillItem {
  id: string;
  type: string;
  description: string;
  buildingObject: { id: string; name: string };
}

interface Props {
  mode?: 'chart' | 'table';
  objectIds?: string[];
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  CORRECTION_PSD: 'Корректировка ПСД',
  LAND_LEGAL: 'Земельно-правовые',
  PRODUCTION: 'Производственные',
  ORG_LEGAL: 'Организационно-правовые',
  CONTRACT_WORK: 'Договорная работа',
  FINANCIAL: 'Финансирование',
  MATERIAL_SUPPLY: 'Поставка материалов',
  WORK_QUALITY: 'Качество работ',
  DEADLINES: 'Сроки',
  OTHER: 'Прочие',
};

const COLORS = [
  '#2563EB', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#9333ea', '#16a34a',
  '#ea580c', '#64748b',
];

export function IssuesWidget({ mode = 'chart', objectIds = [] }: Props) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<IssueDrillItem[]>({
    queryKey: ['dashboard-issues', selectedType, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams({ type: selectedType! });
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/issues?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedType,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Актуальные вопросы</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-36 w-full" /></CardContent>
      </Card>
    );
  }

  const items = analytics?.issuesByType ?? [];
  const total = items.reduce((s, r) => s + r.count, 0);
  const pieData = items.map((r) => ({ name: ISSUE_TYPE_LABELS[r.type] ?? r.type, value: r.count, type: r.type }));

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Актуальные вопросы</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет актуальных вопросов</p>
          ) : mode === 'chart' ? (
            <div className="flex items-start gap-4">
              {/* Donut с числом в центре */}
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
                      onClick={(_, index) => setSelectedType(pieData[index]?.type ?? null)}
                      className="cursor-pointer"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'вопросов']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold leading-none">{total}</span>
                </div>
              </div>
              {/* Легенда */}
              <div className="flex-1 space-y-1 min-w-0">
                {pieData.map((entry, i) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => setSelectedType(entry.type)}
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
            /* mode='table' */
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1 text-left font-medium text-muted-foreground">Тип</th>
                  <th className="py-1 text-right font-medium text-muted-foreground w-16">Кол-во</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <tr
                      key={row.type}
                      onClick={() => setSelectedType(row.type)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <td className="py-1.5 pr-2">
                        {ISSUE_TYPE_LABELS[row.type] ?? row.type}
                        <div
                          className="h-1 bg-primary/50 rounded-full mt-0.5"
                          style={{ width: `${pct}%` }}
                        />
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{row.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Диалог детализации */}
      <Dialog open={!!selectedType} onOpenChange={(open) => !open && setSelectedType(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedType ? (ISSUE_TYPE_LABELS[selectedType] ?? selectedType) : ''}
            </DialogTitle>
          </DialogHeader>
          {drillLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : drillItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет данных</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Объект</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Тип</th>
                  <th className="pb-2 font-medium text-muted-foreground">Проблемный вопрос</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((issue) => (
                  <tr key={issue.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/objects/${issue.buildingObject.id}`}
                        className="text-primary hover:underline font-medium whitespace-nowrap"
                      >
                        {issue.buildingObject.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/objects/${issue.buildingObject.id}`}
                        className="hover:underline"
                      >
                        {issue.description}
                      </Link>
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
