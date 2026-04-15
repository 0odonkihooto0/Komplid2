'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import {
  FileCheck, Download, ChevronDown, FileText, Archive, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { useInspectionActs, type InspectionActListItem } from './useInspectionActs';

interface Props {
  objectId: string;
}

export function InspectionActsView({ objectId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useInspectionActs(objectId);
  const acts = data?.data ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: 'pdf' | 'zip') {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${objectId}/inspection-acts/export`, {
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
        a.download = 'inspection-acts-export.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Ошибка экспорта:', err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePrintDocx(id: string, number: string) {
    try {
      const res = await fetch(
        `/api/projects/${objectId}/inspection-acts/${id}/print?format=docx`,
        { method: 'POST' },
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection-act-${number}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка скачивания Word:', err);
    }
  }

  const columns: ColumnDef<InspectionActListItem, unknown>[] = useMemo(() => [
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
      size: 100,
    },
    {
      id: 'inspection',
      header: 'Проверка',
      cell: ({ row }) => {
        const { inspection } = row.original;
        return (
          <button
            className="text-blue-600 hover:underline text-sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/objects/${objectId}/sk/inspections/${inspection.id}`);
            }}
          >
            №{inspection.number}
          </button>
        );
      },
    },
    {
      id: 'inspector',
      header: 'Проверяющий',
      cell: ({ row }) => {
        const u = row.original.inspection.inspector;
        return `${u.lastName} ${u.firstName}`;
      },
    },
    {
      id: 'issuedAt',
      header: 'Дата выдачи',
      cell: ({ row }) => formatDate(row.original.issuedAt),
    },
    {
      id: 'actions',
      header: '',
      size: 130,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
              <Download className="h-4 w-4 mr-1.5" />
              Печать
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <a
                href={`/api/projects/${objectId}/inspection-acts/${row.original.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Скачать PDF
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                void handlePrintDocx(row.original.id, row.original.number);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Скачать Word (.doc)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  // selectedIds в deps чтобы чекбоксы обновлялись корректно
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [objectId, router, acts, selectedIds]);

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Акты проверки</h2>
          <span className="text-sm text-muted-foreground">({data?.total ?? 0})</span>
        </div>
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
      </div>

      <DataTable
        columns={columns}
        data={acts}
        searchPlaceholder="Поиск по номеру..."
        searchColumn="number"
      />
    </div>
  );
}
