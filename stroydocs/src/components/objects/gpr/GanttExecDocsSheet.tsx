'use client';

import { useState } from 'react';
import { Trash2, Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGanttExecDocs, useLinkExecDoc, useUnlinkExecDoc } from './useGanttScheduleHooks';
import { useQuery } from '@tanstack/react-query';
import type { GanttExecDocRef } from '@/components/modules/gantt/ganttTypes';

const DOC_TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'Акт готовности',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

const DOC_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  IN_REVIEW: 'secondary',
  SIGNED: 'default',
  REJECTED: 'destructive',
};

interface Props {
  objectId: string;
  versionId: string;
  taskId: string;
  taskName: string;
  open: boolean;
  onClose: () => void;
}

export function GanttExecDocsSheet({ objectId, versionId, taskId, taskName, open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<GanttExecDocRef | null>(null);

  const { execDocs, isLoading } = useGanttExecDocs(objectId, versionId, open ? taskId : null);
  const linkExecDoc = useLinkExecDoc(objectId, versionId, taskId);
  const unlinkExecDoc = useUnlinkExecDoc(objectId, versionId, taskId);

  // Поиск ИД по объекту для привязки
  const { data: searchResults } = useQuery<GanttExecDocRef[]>({
    queryKey: ['exec-docs-search', objectId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ search, limit: '20' });
      const res = await fetch(`/api/projects/${objectId}/execution-docs?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка поиска');
      return json.data;
    },
    enabled: search.length >= 2,
  });

  // Фильтруем уже привязанные из результатов поиска
  const linkedIds = new Set(execDocs.map((d) => d.id));
  const availableResults = (searchResults ?? []).filter((d) => !linkedIds.has(d.id));

  function handleLink() {
    if (!selectedDoc) return;
    linkExecDoc.mutate(selectedDoc.id, {
      onSuccess: () => {
        setSelectedDoc(null);
        setSearch('');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Исполнительная документация
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Задача: {taskName}</p>
        </DialogHeader>

        {/* Привязанные документы */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Привязанные документы</p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка...
            </div>
          ) : execDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Нет привязанных документов</p>
          ) : (
            <div className="space-y-1">
              {execDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                    {doc.number}
                  </span>
                  <span className="flex-1 truncate">{doc.title}</span>
                  <Badge variant={DOC_STATUS_VARIANTS[doc.status] ?? 'outline'} className="text-xs shrink-0">
                    {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => unlinkExecDoc.mutate(doc.id)}
                    disabled={unlinkExecDoc.isPending}
                    aria-label="Отвязать документ"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Поиск и привязка */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">Привязать документ</p>
          <div className="flex gap-2">
            <Input
              placeholder="Поиск по номеру или наименованию (мин. 2 символа)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedDoc(null);
              }}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              onClick={handleLink}
              disabled={!selectedDoc || linkExecDoc.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Привязать
            </Button>
          </div>

          {availableResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded border p-1">
              {availableResults.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors ${
                    selectedDoc?.id === doc.id ? 'bg-accent' : ''
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                    {doc.number}
                  </span>
                  <span className="flex-1 truncate">{doc.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedDoc && (
            <div className="rounded bg-accent px-3 py-2 text-sm">
              Выбран: <span className="font-medium">{selectedDoc.number}</span> {selectedDoc.title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
