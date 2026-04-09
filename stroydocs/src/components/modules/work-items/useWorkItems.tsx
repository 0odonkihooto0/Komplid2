'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';

interface WorkItemMaterial {
  id: string;
  name: string;
  unit: string;
  quantityReceived: number;
}

export interface WorkItem {
  id: string;
  projectCipher: string;
  name: string;
  description: string | null;
  unit: string | null;
  volume: number | null;
  normatives: string | null;
  ksiNode: { code: string; name: string } | null;
  _count: { workRecords: number; materials: number };
  materials: WorkItemMaterial[];
  createdAt: string;
}

export function useWorkItems(contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());

  const { data: workItems = [], isLoading } = useQuery<WorkItem[]>({
    queryKey: ['work-items', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/work-items`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      projectCipher: string;
      name: string;
      description?: string;
      ksiNodeId?: string;
    }) => {
      const res = await fetch(`/api/contracts/${contractId}/work-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', contractId] });
      toast({ title: 'Вид работ добавлен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const toggleMaterials = (workItemId: string) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(workItemId)) { next.delete(workItemId); } else { next.add(workItemId); }
      return next;
    });
  };

  const columns: ColumnDef<WorkItem>[] = useMemo(() => [
    {
      accessorKey: 'projectCipher',
      header: 'Шифр',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.projectCipher}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Наименование работы',
    },
    {
      accessorKey: 'ksiNode',
      header: 'КСИ',
      cell: ({ row }) =>
        row.original.ksiNode ? (
          <span className="text-sm">
            <span className="font-mono text-muted-foreground">{row.original.ksiNode.code}</span>
            {' '}
            {row.original.ksiNode.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">— без КСИ —</span>
        ),
    },
    {
      accessorKey: 'unit',
      header: 'Ед.изм.',
      cell: ({ row }) => row.original.unit || '—',
    },
    {
      accessorKey: 'volume',
      header: 'Объём',
      cell: ({ row }) => row.original.volume ?? '—',
    },
    {
      accessorKey: 'normatives',
      header: 'Нормативы',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground break-words">
          {row.original.normatives || '—'}
        </span>
      ),
    },
    {
      accessorKey: '_count.workRecords',
      header: 'Записи',
      cell: ({ row }) => row.original._count.workRecords,
    },
    {
      id: 'materials',
      header: 'Материалы',
      cell: ({ row }) => {
        const count = row.original._count?.materials ?? 0;
        if (count === 0) return <span className="text-sm text-muted-foreground">—</span>;
        const isExpanded = expandedMaterials.has(row.original.id);
        return (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMaterials(row.original.id);
              }}
              className="text-left"
            >
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                {count} матер.
              </Badge>
            </button>
            {isExpanded && row.original.materials.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {row.original.materials.map((m) => (
                  <div key={m.id} className="text-xs text-muted-foreground pl-1">
                    {m.name} — {m.quantityReceived} {m.unit.toLowerCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [expandedMaterials]);

  return { workItems, columns, isLoading, createMutation };
}
