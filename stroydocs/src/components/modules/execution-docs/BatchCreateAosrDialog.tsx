'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/utils/format';

interface WorkRecord {
  id: string;
  date: string;
  location: string;
  status: string;
  workItem: { name: string; projectCipher: string };
  _hasAosr?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
}

/** Диалог пакетного создания АОСР по нескольким записям о работах */
export function BatchCreateAosrDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: records = [], isLoading } = useQuery<WorkRecord[]>({
    queryKey: ['work-records-for-batch', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/contracts/${contractId}/work-records`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: open,
  });

  const batchCreateMutation = useMutation({
    mutationFn: async (workRecordIds: string[]) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/execution-docs/batch-create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workRecordIds }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка создания АОСР');
      return json.data;
    },
    onSuccess: (data) => {
      toast({ title: `Создано ${data.created} из ${data.total} АОСР` });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      setSelectedIds(new Set());
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(records.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleCreate = () => {
    if (selectedIds.size === 0) return;
    batchCreateMutation.mutate(Array.from(selectedIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Пакетное создание АОСР</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Выбрано: {selectedIds.size} из {records.length}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>Все</Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>Сбросить</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-48 animate-pulse rounded-md bg-muted" />
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Нет записей о работах
            </p>
          ) : (
            <ScrollArea className="h-64 rounded-md border">
              <div className="space-y-1 p-2">
                {records.map((record) => (
                  <label
                    key={record.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedIds.has(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{record.workItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.workItem.projectCipher} · {formatDate(record.date)} · {record.location}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {record.status === 'COMPLETED' ? 'Выполнено'
                        : record.status === 'IN_PROGRESS' ? 'В работе'
                        : 'Черновик'}
                    </Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedIds.size === 0 || batchCreateMutation.isPending}
          >
            {batchCreateMutation.isPending
              ? 'Создание...'
              : `Создать АОСР (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
