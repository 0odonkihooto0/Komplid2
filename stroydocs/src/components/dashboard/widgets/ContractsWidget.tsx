'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ContractStatus } from '@prisma/client';

interface ContractTypeStat {
  type: string;
  count: number;
}

interface AnalyticsData {
  contractsByType: ContractTypeStat[];
}

interface ContractItem {
  id: string;
  number: string;
  name: string;
  type: string;
  status: ContractStatus;
  startDate: string | null;
  projectId: string;
  _count: { childContracts: number };
}

interface Props {
  objectIds?: string[];
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  MAIN: 'Основной',
  SUBCONTRACT: 'Субдоговор',
};

type SortField = 'number' | 'startDate' | 'status' | 'name';

export function ContractsWidget({ objectIds = [] }: Props) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortAsc, setSortAsc] = useState(false);

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

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractItem[]>({
    queryKey: ['dashboard-contracts-by-type', expandedType, objectIds],
    queryFn: async () => {
      const params = new URLSearchParams({ type: expandedType! });
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const res = await fetch(`/api/dashboard/contracts-by-type?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!expandedType,
    staleTime: 5 * 60 * 1000,
  });

  const handleTypeClick = (type: string) => {
    setExpandedType((prev) => (prev === type ? null : type));
    setFilterText('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    const q = filterText.toLowerCase();
    return contracts.filter(
      (c) =>
        !q ||
        c.number.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [contracts, filterText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'number') cmp = a.number.localeCompare(b.number);
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'startDate') {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        cmp = da - db;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortField, sortAsc]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Контрактация по контрактам</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  const items = analytics?.contractsByType ?? [];

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
    ) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Контрактация по контрактам</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет данных по контрактам</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left font-medium text-muted-foreground">Вид контракта</th>
                <th className="py-1 text-right font-medium text-muted-foreground w-16">Количество</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.type}
                  onClick={() => handleTypeClick(row.type)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <td className="py-1.5 pr-2 flex items-center gap-1">
                    {expandedType === row.type ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    {CONTRACT_TYPE_LABELS[row.type] ?? row.type}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Развёрнутая детализация */}
        {expandedType && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">
                {CONTRACT_TYPE_LABELS[expandedType] ?? expandedType}
              </p>
              <Input
                placeholder="Поиск по номеру или наименованию..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-7 text-xs max-w-56"
              />
            </div>
            {contractsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет контрактов</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b">
                      <th
                        className="py-1 pr-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('number')}
                      >
                        Номер<SortIcon field="number" />
                      </th>
                      <th
                        className="py-1 pr-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('startDate')}
                      >
                        Дата<SortIcon field="startDate" />
                      </th>
                      <th
                        className="py-1 pr-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('status')}
                      >
                        Статус<SortIcon field="status" />
                      </th>
                      <th
                        className="py-1 pr-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('name')}
                      >
                        Наименование<SortIcon field="name" />
                      </th>
                      <th className="py-1 pr-3 text-left font-medium text-muted-foreground">
                        Вид
                      </th>
                      <th className="py-1 text-right font-medium text-muted-foreground">
                        Доп.соглашения
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-1.5 pr-3">
                          <Link
                            href={`/objects/${c.projectId}/contracts/${c.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {c.number}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {c.startDate ? formatDate(c.startDate) : '—'}
                        </td>
                        <td className="py-1.5 pr-3">
                          {CONTRACT_STATUS_LABELS[c.status]}
                        </td>
                        <td className="py-1.5 pr-3 max-w-48 truncate" title={c.name}>
                          {c.name}
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {CONTRACT_TYPE_LABELS[c.type] ?? c.type}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {c._count.childContracts > 0 ? c._count.childContracts : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
