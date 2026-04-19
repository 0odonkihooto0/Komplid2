'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { Download, FileArchive } from 'lucide-react';
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
import { EXECUTION_DOC_TYPE_LABELS, EXECUTION_DOC_STATUS_LABELS } from '@/utils/constants';

interface ExecutionDoc {
  id: string;
  type: string;
  number: string;
  title: string;
  status: string;
  s3Key: string | null;
}

interface Props {
  projectId: string;
  contractId: string;
}

/** Кнопка пакетного экспорта ИД в один PDF */
export function BatchExportButton({ projectId, contractId }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: docs = [], isLoading } = useQuery<ExecutionDoc[]>({
    queryKey: ['execution-docs-for-export', contractId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/execution-docs`
      );
      const json = await res.json();
      return json.data || [];
    },
    enabled: open,
  });

  const exportMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/execution-docs/batch-export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docIds }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка экспорта');
      return json.data;
    },
    onSuccess: (data) => {
      toast({ title: `Экспортировано ${data.docsIncluded} документов, ${data.pagesTotal} страниц` });
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
      setSelectedIds(new Set());
      setOpen(false);
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

  const docsWithPdf = docs.filter((d) => d.s3Key);
  const selectAll = () => setSelectedIds(new Set(docsWithPdf.map((d) => d.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    exportMutation.mutate(Array.from(selectedIds));
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileArchive className="mr-2 h-4 w-4" />
        Экспорт в PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Пакетный экспорт документов в PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Выбрано: {selectedIds.size} (из {docsWithPdf.length} с PDF)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>Все с PDF</Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>Сбросить</Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-48 animate-pulse rounded-md bg-muted" />
            ) : docs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет документов</p>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <div className="space-y-1 p-2">
                  {docs.map((doc) => (
                    <label
                      key={doc.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md p-2 ${
                        !doc.s3Key ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(doc.id)}
                        onCheckedChange={() => doc.s3Key && toggleSelect(doc.id)}
                        disabled={!doc.s3Key}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(EXECUTION_DOC_TYPE_LABELS as Record<string, string>)[doc.type]} · {doc.number}
                          {!doc.s3Key && ' · PDF не сгенерирован'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {(EXECUTION_DOC_STATUS_LABELS as Record<string, string>)[doc.status] || doc.status}
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button
              onClick={handleExport}
              disabled={selectedIds.size === 0 || exportMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportMutation.isPending ? 'Экспорт...' : `Скачать (${selectedIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
