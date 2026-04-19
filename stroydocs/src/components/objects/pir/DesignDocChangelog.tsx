'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';

interface ChangeRecord {
  id: string;
  version: number;
  changeDescription: string;
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface Props {
  projectId: string;
  docId: string;
  currentVersion: number;
}

export function DesignDocChangelog({ projectId, docId, currentVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseUrl = `/api/projects/${projectId}/design-docs/${docId}/changes`;

  const { data: changes, isLoading } = useQuery<ChangeRecord[]>({
    queryKey: ['design-doc-changes', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки журнала изменений');
      const json: ApiResponse<ChangeRecord[]> = await res.json();
      return json.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ошибка добавления записи');
      }
    },
    onSuccess: () => {
      toast({ title: 'Запись добавлена' });
      setDescription('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['design-doc-changes', docId] });
      queryClient.invalidateQueries({ queryKey: ['design-doc', docId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          История изменений документа
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Добавить запись
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !changes || changes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-center">
          <History className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">История изменений пуста</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Записи добавляются автоматически при смене версии или статуса, а также вручную
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Версия</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Описание изменения</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Автор</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {changes.map((change) => (
                <tr key={change.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">v{change.version}</td>
                  <td className="px-4 py-3">{change.changeDescription}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {change.author.lastName} {change.author.firstName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(change.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить запись об изменении</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Версия №{currentVersion}
            </p>
            <Textarea
              placeholder="Опишите изменение..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!description.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
