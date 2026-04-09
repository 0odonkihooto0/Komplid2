'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImportFromEstimate } from './useGanttStructure';

interface ContractItem {
  id: string;
  number: string;
  name: string;
}

interface EstimateVersionItem {
  id: string;
  name: string;
  versionType: string;
  _count: { chapters: number };
}

interface Props {
  objectId: string;
  versionId: string;
  onClose: () => void;
}

export function ImportFromEstimateDialog({ objectId, versionId, onClose }: Props) {
  const [contractId, setContractId] = useState('');
  const [estimateVersionId, setEstimateVersionId] = useState('');

  const importMutation = useImportFromEstimate(objectId);

  // Загружаем список контрактов объекта
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractItem[]>({
    queryKey: ['contracts-for-import', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/contracts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки договоров');
      // API возвращает { data: { data: [...], total, ... } } или { data: [...] }
      const raw = json.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
  });

  // Загружаем версии сметы выбранного контракта
  const { data: estimateVersions = [], isLoading: versionsLoading } = useQuery<EstimateVersionItem[]>({
    queryKey: ['estimate-versions-for-import', contractId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/contracts/${contractId}/estimate-versions`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки версий сметы');
      const raw = json.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: !!contractId,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!estimateVersionId) return;
    importMutation.mutate(
      { versionId, estimateVersionId },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Заполнить ГПР из сметы</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {/* Шаг 1: выбор договора */}
            <div className="space-y-1.5">
              <Label>Договор</Label>
              <Select
                value={contractId}
                onValueChange={(val) => {
                  setContractId(val);
                  setEstimateVersionId('');
                }}
                disabled={contractsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите договор..." />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Шаг 2: выбор версии сметы */}
            <div className="space-y-1.5">
              <Label>Версия сметы</Label>
              <Select
                value={estimateVersionId}
                onValueChange={setEstimateVersionId}
                disabled={!contractId || versionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !contractId
                        ? 'Сначала выберите договор'
                        : versionsLoading
                        ? 'Загрузка...'
                        : 'Выберите версию сметы...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {estimateVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v._count.chapters} разделов)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Из выбранной сметы будут созданы задачи ГПР. Версия должна быть пустой.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!estimateVersionId || importMutation.isPending}
            >
              {importMutation.isPending ? 'Импорт...' : 'Заполнить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
