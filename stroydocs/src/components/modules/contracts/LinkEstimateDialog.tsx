'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLocalEstimates } from './useLocalEstimates';
import type { LinkedEstimateItem } from './useLocalEstimates';

interface EstimateOption {
  id: string;
  name: string;
  versionType: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function LinkEstimateDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const { linkMutation, estimates: linked } = useLocalEstimates(projectId, contractId);
  // linked — массив LinkedEstimateItem, используем estimateVersion.id для фильтрации

  /** Загружаем все версии смет контракта для выбора */
  const { data: versions, isLoading } = useQuery<EstimateOption[]>({
    queryKey: ['estimate-versions-list', projectId, contractId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/estimate-versions`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  /** Фильтруем уже привязанные версии по estimateVersion.id */
  const linkedIds = new Set((linked as LinkedEstimateItem[]).map((e) => e.estimateVersion.id));
  const options = versions?.filter((v) => !linkedIds.has(v.id)) ?? [];

  function handleConfirm() {
    if (!selectedId) return;
    linkMutation.mutate(selectedId, {
      onSuccess: () => {
        setSelectedId('');
        onOpenChange(false);
      },
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v) setSelectedId('');
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Привязать смету</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите версию сметы для привязки к договору
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Версия сметы</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите версию сметы..." />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Нет доступных версий смет
                    </SelectItem>
                  ) : (
                    options.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || linkMutation.isPending}
          >
            {linkMutation.isPending ? 'Привязка...' : 'Привязать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
