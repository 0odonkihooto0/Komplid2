'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSearchAvailableDocs, useAddLinkedDoc } from './useLinkedDocs';

// Метки типов документов ИД
const TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  KS_2: 'КС-2',
  KS_3: 'КС-3',
  GENERAL_DOCUMENT: 'Общий',
  KS_6A: 'КС-6а',
  KS_11: 'КС-11',
  KS_14: 'КС-14',
  TECHNICAL_READINESS_ACT: 'АТГ',
};

// Метки статусов документов
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'default',
  SIGNED: 'default',
  REJECTED: 'destructive',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
  docId: string;
}

export function AddLinkedDocDialog({ open, onOpenChange, projectId, contractId, docId }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState(true);

  // Дебаунс 300 мс перед запросом поиска
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearchAvailableDocs(
    projectId,
    contractId,
    docId,
    debouncedQuery,
    orgFilter,
    open
  );

  const addMutation = useAddLinkedDoc(projectId, contractId, docId);

  function handleAdd(targetDocId: string) {
    addMutation.mutate({ targetDocId }, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить связанный документ</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Строка поиска */}
          <Input
            placeholder="Поиск по номеру или названию..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Фильтр по организации */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="orgFilter"
              checked={orgFilter}
              onCheckedChange={(v) => setOrgFilter(v === true)}
            />
            <label htmlFor="orgFilter" className="text-sm cursor-pointer">
              Только моя организация
            </label>
          </div>

          {/* Таблица результатов */}
          {isLoading && (
            <p className="text-sm text-muted-foreground">Поиск...</p>
          )}

          {!isLoading && results.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Номер</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Тип</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Статус</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Договор</th>
                    <th className="px-3 py-2 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {results.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{doc.number}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{TYPE_LABELS[doc.type] ?? doc.type}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={STATUS_VARIANTS[doc.status] ?? 'secondary'}>
                          {STATUS_LABELS[doc.status] ?? doc.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{doc.contract.name}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          onClick={() => handleAdd(doc.id)}
                          disabled={addMutation.isPending}
                        >
                          Привязать
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Пустое состояние */}
          {!isLoading && results.length === 0 && (
            <div className="flex items-center justify-center rounded-md border border-dashed py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {query.trim() === '' ? 'Введите текст для поиска' : 'Ничего не найдено'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
