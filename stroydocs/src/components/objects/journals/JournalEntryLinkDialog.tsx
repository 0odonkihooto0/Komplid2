'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApiResponse } from '@/types/api';
import type { JournalLinkType } from '@prisma/client';
import type { JournalEntryItem } from './journal-constants';

// Сокращённый тип для списка журналов
interface JournalOption {
  id: string;
  number: string;
  title: string;
  type: string;
  _count: { entries: number };
}

interface Props {
  open: boolean;
  onClose: () => void;
  objectId: string;
  sourceEntryId: string;
  onConfirm: (targetEntryId: string, linkType: JournalLinkType) => void;
  isLoading?: boolean;
}

export function JournalEntryLinkDialog({
  open,
  onClose,
  objectId,
  sourceEntryId,
  onConfirm,
  isLoading,
}: Props) {
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');

  // Загрузка журналов ЖВК (INPUT_CONTROL) объекта
  const { data: journals = [] } = useQuery<JournalOption[]>({
    queryKey: ['journals-jvk', objectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/journals?type=INPUT_CONTROL&limit=100`
      );
      if (!res.ok) throw new Error('Ошибка загрузки журналов');
      const json: ApiResponse<JournalOption[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data ?? [];
    },
    enabled: open,
  });

  // Загрузка записей выбранного ЖВК
  const { data: entries = [] } = useQuery<JournalEntryItem[]>({
    queryKey: ['journal-entries-link', objectId, selectedJournalId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/journals/${selectedJournalId}/entries?limit=200`
      );
      if (!res.ok) throw new Error('Ошибка загрузки записей');
      const json: ApiResponse<JournalEntryItem[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data ?? [];
    },
    enabled: open && !!selectedJournalId,
  });

  function handleClose() {
    setSelectedJournalId('');
    setSelectedEntryId('');
    onClose();
  }

  function handleConfirm() {
    if (!selectedEntryId) return;
    onConfirm(selectedEntryId, 'OZR_TO_JVK');
    setSelectedJournalId('');
    setSelectedEntryId('');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить связь с записью ЖВК</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Выбор журнала */}
          <div className="space-y-1">
            <Label className="text-sm">Журнал входного контроля (ЖВК)</Label>
            <Select
              value={selectedJournalId || 'NONE'}
              onValueChange={(v) => {
                setSelectedJournalId(v === 'NONE' ? '' : v);
                setSelectedEntryId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите ЖВК..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE" disabled>
                  Выберите журнал
                </SelectItem>
                {journals.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.number} — {j.title}
                  </SelectItem>
                ))}
                {journals.length === 0 && (
                  <SelectItem value="__EMPTY__" disabled>
                    Нет доступных журналов ЖВК
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Выбор записи */}
          {selectedJournalId && (
            <div className="space-y-1">
              <Label className="text-sm">Запись журнала</Label>
              <Select
                value={selectedEntryId || 'NONE'}
                onValueChange={(v) => setSelectedEntryId(v === 'NONE' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите запись..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>
                    Выберите запись
                  </SelectItem>
                  {entries
                    .filter((e) => e.id !== sourceEntryId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        №{e.entryNumber}{' '}
                        {format(new Date(e.date), 'd MMM yyyy', { locale: ru })} —{' '}
                        {e.description.length > 50
                          ? `${e.description.slice(0, 47)}...`
                          : e.description}
                      </SelectItem>
                    ))}
                  {entries.length === 0 && (
                    <SelectItem value="__EMPTY__" disabled>
                      Нет записей в журнале
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedEntryId || isLoading}
          >
            {isLoading ? 'Создание...' : 'Добавить связь'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
