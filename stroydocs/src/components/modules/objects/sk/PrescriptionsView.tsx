'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle, Download, ChevronDown, FileText, Archive, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { usePrescriptions, type PrescriptionListItem } from './usePrescriptions';

interface Props {
  objectId: string;
}

const TYPE_LABELS: Record<string, string> = {
  DEFECT_ELIMINATION: 'УН',
  WORK_SUSPENSION: 'ПР',
};

const TYPE_VARIANTS: Record<string, 'default' | 'destructive'> = {
  DEFECT_ELIMINATION: 'default',
  WORK_SUSPENSION: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  CLOSED: 'Закрыто',
};

export function PrescriptionsView({ objectId }: Props) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: 'pdf' | 'zip') {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${objectId}/prescriptions/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), format }),
      });
      if (!res.ok) return;
      if (format === 'zip') {
        const json = await res.json() as { data: { downloadUrl: string; fileName: string } };
        const a = document.createElement('a');
        a.href = json.data.downloadUrl;
        a.download = json.data.fileName;
        a.click();
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prescriptions-export.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Ошибка экспорта предписаний:', err);
    } finally {
      setIsExporting(false);
    }
  }

  const filters = useMemo(() => ({
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }), [typeFilter, statusFilter]);

  const { data, isLoading } = usePrescriptions(objectId, filters);
  const prescriptions = data?.data ?? [];
  const now = useMemo(() => new Date(), []);

  const columns: ColumnDef<PrescriptionListItem, unknown>[] = useMemo(() => [
    {
      id: 'select',
      size: 40,
      header: () => (
        <Checkbox
          checked={prescriptions.length > 0 && selectedIds.size === prescriptions.length}
          onCheckedChange={(v) =>
            setSelectedIds(v ? new Set(prescriptions.map((p) => p.id)) : new Set())
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={(v) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (v) next.add(row.original.id); else next.delete(row.original.id);
              return next;
            });
          }}
        />
      ),
    },
    {
      accessorKey: 'number',
      header: '№',
      size: 100,
    },
    {
      accessorKey: 'type',
      header: 'Тип',
      cell: ({ row }) => {
        const { type } = row.original;
        return (
          <Badge variant={TYPE_VARIANTS[type] ?? 'outline'}>
            {TYPE_LABELS[type] ?? type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const { status } = row.original;
        return (
          <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
    },
    {
      id: 'inspection',
      header: 'Проверка',
      cell: ({ row }) => `№${row.original.inspection.number}`,
    },
    {
      id: 'responsible',
      header: 'Ответственный',
      cell: ({ row }) => {
        const u = row.original.responsible;
        return u ? `${u.lastName} ${u.firstName}` : '—';
      },
    },
    {
      id: 'deadline',
      header: 'Срок',
      cell: ({ row }) => {
        const { deadline, status } = row.original;
        if (!deadline) return '—';
        const isOverdue = status === 'ACTIVE' && new Date(deadline) < now;
        return (
          <span className={cn(isOverdue && 'text-red-600 font-medium')}>
            {formatDate(deadline)}
          </span>
        );
      },
    },
    {
      id: 'defects',
      header: 'Недостатков',
      size: 100,
      cell: ({ row }) => row.original._count.defects,
    },
  // selectedIds в deps чтобы чекбоксы обновлялись корректно
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [now, prescriptions, selectedIds]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Предписания</h2>
          <span className="text-sm text-muted-foreground">({data?.total ?? 0})</span>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  {isExporting
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Скачать ({selectedIds.size})
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => void handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Скачать сводным PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport('zip')}>
                  <Archive className="h-4 w-4 mr-2" />
                  Скачать архивом (ZIP)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="DEFECT_ELIMINATION">УН — Устранение</SelectItem>
              <SelectItem value="WORK_SUSPENSION">ПР — Приостановка</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="ACTIVE">Активные</SelectItem>
              <SelectItem value="CLOSED">Закрытые</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={prescriptions}
        searchPlaceholder="Поиск по номеру..."
        searchColumn="number"
        onRowClick={(row) => router.push(`/objects/${objectId}/sk/prescriptions/${row.id}`)}
      />
    </div>
  );
}
