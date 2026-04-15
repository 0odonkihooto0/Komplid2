'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle, Download, ChevronDown, FileText, Archive, Loader2,
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
import { CreateRemediationDialog } from './CreateRemediationDialog';
import { useRemediationActs, type RemediationActListItem } from './useRemediationActs';
import { formatDate } from '@/utils/format';

interface Props {
  objectId: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT:          'Черновик',
  PENDING_REVIEW: 'На проверке',
  ACCEPTED:       'Принят',
  REJECTED:       'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT:          'outline',
  PENDING_REVIEW: 'default',
  ACCEPTED:       'secondary',
  REJECTED:       'destructive',
};

export function RemediationActsView({ objectId }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: 'pdf' | 'zip') {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${objectId}/remediation-acts/export`, {
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
        a.download = 'remediation-acts-export.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Ошибка экспорта актов устранения:', err);
    } finally {
      setIsExporting(false);
    }
  }

  const filters = useMemo(
    () => (statusFilter !== 'all' ? { status: statusFilter } : {}),
    [statusFilter],
  );

  const { data, isLoading } = useRemediationActs(objectId, filters);
  const acts = data?.data ?? [];
  const total = data?.total ?? 0;

  // KPI-счётчики из текущей выборки (без фильтра статуса)
  const { data: allData } = useRemediationActs(objectId, {});
  const allActs = allData?.data ?? [];
  const kpiDraft    = allActs.filter((a) => a.status === 'DRAFT').length;
  const kpiPending  = allActs.filter((a) => a.status === 'PENDING_REVIEW').length;
  const kpiAccepted = allActs.filter((a) => a.status === 'ACCEPTED').length;

  const columns: ColumnDef<RemediationActListItem, unknown>[] = useMemo(() => [
    {
      id: 'select',
      size: 40,
      header: () => (
        <Checkbox
          checked={acts.length > 0 && selectedIds.size === acts.length}
          onCheckedChange={(v) =>
            setSelectedIds(v ? new Set(acts.map((a) => a.id)) : new Set())
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
      size: 90,
    },
    {
      id: 'prescription',
      header: 'Предписание',
      cell: ({ row }) => row.original.prescription.number,
    },
    {
      id: 'inspection',
      header: 'Проверка',
      cell: ({ row }) => row.original.inspection.number,
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge variant={STATUS_VARIANTS[s] ?? 'outline'}>
            {STATUS_LABELS[s] ?? s}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'issuedAt',
      header: 'Дата составления',
      cell: ({ row }) => formatDate(row.original.issuedAt),
    },
    {
      id: 'issuedBy',
      header: 'Автор',
      cell: ({ row }) => {
        const u = row.original.issuedBy;
        return `${u.lastName} ${u.firstName}`;
      },
    },
  // selectedIds в deps чтобы чекбоксы обновлялись корректно
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [acts, selectedIds]);

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
      {/* KPI-карточки */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{allData?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Всего</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{kpiDraft}</p>
          <p className="text-xs text-muted-foreground">Черновики</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{kpiPending}</p>
          <p className="text-xs text-muted-foreground">На проверке</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{kpiAccepted}</p>
          <p className="text-xs text-muted-foreground">Принято</p>
        </div>
      </div>

      {/* Шапка с фильтром и кнопкой */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Акты устранения недостатков</h2>
          <span className="text-sm text-muted-foreground">({total})</span>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="DRAFT">Черновики</SelectItem>
              <SelectItem value="PENDING_REVIEW">На проверке</SelectItem>
              <SelectItem value="ACCEPTED">Принятые</SelectItem>
              <SelectItem value="REJECTED">Отклонённые</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setDialogOpen(true)}>
            Создать акт устранения
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={acts}
        searchPlaceholder="Поиск по номеру..."
        searchColumn="number"
        onRowClick={(row) => router.push(`/objects/${objectId}/sk/remediation-acts/${row.id}`)}
      />

      <CreateRemediationDialog
        objectId={objectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
