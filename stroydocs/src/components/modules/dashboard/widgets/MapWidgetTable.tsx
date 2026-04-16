'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';

interface ObjectRow {
  id: string;
  name: string;
  status: string;
  constructionType: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
  ARCHIVED: 'outline',
};

type SortKey = 'name' | 'constructionType' | 'status' | 'plannedStartDate' | 'plannedEndDate';

interface MapWidgetTableProps {
  objects: ObjectRow[];
}

export function MapWidgetTable({ objects }: MapWidgetTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...objects].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv), 'ru');
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortAsc
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  };

  const Th = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap text-xs"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </TableHead>
  );

  if (objects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Нет объектов для отображения
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-[280px]">
      <Table>
        <TableHeader>
          <TableRow>
            <Th col="name">Наименование</Th>
            <Th col="constructionType">Тип объекта</Th>
            <Th col="status">Статус</Th>
            <Th col="plannedStartDate">Дата начала</Th>
            <Th col="plannedEndDate">Дата окончания</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((obj) => (
            <TableRow key={obj.id} className="text-xs">
              <TableCell className="font-medium max-w-[160px] truncate">
                <Link
                  href={`/objects/${obj.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {obj.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[120px] truncate">
                {obj.constructionType ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[obj.status] ?? 'outline'} className="text-[10px]">
                  {(PROJECT_STATUS_LABELS as Record<string, string>)[obj.status] ?? obj.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {obj.plannedStartDate ? formatDate(obj.plannedStartDate) : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {obj.plannedEndDate ? formatDate(obj.plannedEndDate) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
