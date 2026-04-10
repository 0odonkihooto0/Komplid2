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
import { useLinkedContracts } from './useLinkedContracts';

interface ContractOption {
  id: string;
  number: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
}

export function LinkContractDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const { linkMutation } = useLinkedContracts(projectId, contractId);

  /** Загружаем список договоров проекта для выбора */
  const { data: contracts, isLoading } = useQuery<ContractOption[]>({
    queryKey: ['contracts-list', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  /** Фильтруем — нельзя привязать сам к себе */
  const options = contracts?.filter((c) => c.id !== contractId) ?? [];

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
          <DialogTitle>Привязать договор</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите договор для привязки как субподрядный
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Договор</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите договор..." />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Нет доступных договоров
                    </SelectItem>
                  ) : (
                    options.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.number} — {c.name}
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
