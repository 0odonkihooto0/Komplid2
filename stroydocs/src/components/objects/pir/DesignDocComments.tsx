'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface DesignDocComment {
  id: string;
  number: number;
  text: string;
  commentType: string | null;
  urgency: string | null;
  deadline: string | null;
  status: 'ACTIVE' | 'ANSWERED' | 'CLOSED';
  requiresAttention: boolean;
  response: string | null;
  respondedAt: string | null;
  author: CommentUser;
  assignee: CommentUser | null;
  respondedBy: CommentUser | null;
  s3Keys: string[];
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface Props {
  projectId: string;
  docId: string;
  sessionUserId: string;
}

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Активно',   className: 'bg-red-100 text-red-700' },
  ANSWERED: { label: 'Ответ дан', className: 'bg-orange-100 text-orange-700' },
  CLOSED:   { label: 'Закрыто',   className: 'bg-green-100 text-green-700' },
};

export function DesignDocComments({ projectId, docId, sessionUserId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/design-docs/${docId}/comments`;

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<DesignDocComment | null>(null);

  // Поля формы создания
  const [newText, setNewText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // Поле ответа
  const [responseText, setResponseText] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['design-doc-comments', docId] });

  const { data: comments = [], isLoading } = useQuery<DesignDocComment[]>({
    queryKey: ['design-doc-comments', docId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки замечаний');
      const json = await res.json();
      return (json.data as { data: DesignDocComment[] })?.data ?? [];
    },
    enabled: !!docId,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      return (json.success as boolean) ? (json.data as Employee[]) : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText,
          deadline: newDeadline ? new Date(newDeadline).toISOString() : undefined,
          assigneeId: newAssigneeId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? 'Ошибка создания замечания');
      }
    },
    onSuccess: () => {
      toast({ title: 'Замечание добавлено' });
      setCreateOpen(false);
      setNewText('');
      setNewDeadline('');
      setNewAssigneeId('');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['design-doc', docId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const patchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!selectedComment) return null;
      const res = await fetch(`${baseUrl}/${selectedComment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? 'Ошибка обновления замечания');
      }
      const json = await res.json();
      return json.data as DesignDocComment;
    },
    onSuccess: (updated) => {
      toast({ title: 'Замечание обновлено' });
      if (updated) setSelectedComment(updated);
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Замечания ({comments.length})</span>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Добавить замечание
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Замечаний нет</p>
      )}

      {!isLoading && (
        <div className="space-y-2">
          {comments.map((c) => {
            const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
            return (
              <div
                key={c.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                onClick={() => setSelectedComment(c)}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">№{c.number}</span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
                        cfg.className
                      )}
                    >
                      {cfg.label}
                    </span>
                    {c.deadline && (
                      <span className="text-xs text-muted-foreground">
                        до {formatDate(c.deadline)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm">{c.text}</p>
                  {c.assignee && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ответственный: {c.assignee.lastName} {c.assignee.firstName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Диалог создания замечания */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новое замечание</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Описание замечания *</Label>
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Опишите замечание к документу..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Срок устранения</Label>
              <Input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ответственный</Label>
              <Select value={newAssigneeId || 'NONE'} onValueChange={(v) => setNewAssigneeId(v === 'NONE' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Не выбрано —</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.lastName} {e.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newText.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог деталей замечания */}
      <Dialog
        open={!!selectedComment}
        onOpenChange={(open: boolean) => { if (!open) setSelectedComment(null); }}
      >
        <DialogContent className="max-w-md">
          {selectedComment && (
            <>
              <DialogHeader>
                <DialogTitle>Замечание №{selectedComment.number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Описание</p>
                  <p className="mt-1 text-sm">{selectedComment.text}</p>
                </div>

                {selectedComment.deadline && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Срок</p>
                    <p className="mt-1 text-sm">{formatDate(selectedComment.deadline)}</p>
                  </div>
                )}

                {selectedComment.assignee && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ответственный</p>
                    <p className="mt-1 text-sm">
                      {selectedComment.assignee.lastName} {selectedComment.assignee.firstName}
                    </p>
                  </div>
                )}

                {selectedComment.response && (
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Ответ</p>
                    <p className="mt-1 text-sm">{selectedComment.response}</p>
                    {selectedComment.respondedBy && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedComment.respondedBy.lastName} {selectedComment.respondedBy.firstName}
                        {selectedComment.respondedAt
                          ? ` · ${formatDate(selectedComment.respondedAt)}`
                          : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Форма ответа: показывать если я назначен и замечание активно */}
                {selectedComment.status === 'ACTIVE' &&
                  selectedComment.assignee?.id === sessionUserId && (
                    <div className="space-y-2">
                      <Label>Ответ на замечание</Label>
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Опишите выполненные действия..."
                        rows={3}
                      />
                      <Button
                        className="w-full"
                        onClick={() => {
                          patchMutation.mutate({ response: responseText });
                          setResponseText('');
                        }}
                        disabled={!responseText.trim() || patchMutation.isPending}
                      >
                        Ответить
                      </Button>
                    </div>
                  )}

                {/* Принять/вернуть: если я автор и ответ дан */}
                {selectedComment.status === 'ANSWERED' &&
                  selectedComment.author.id === sessionUserId && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => patchMutation.mutate({ action: 'reopen' })}
                        disabled={patchMutation.isPending}
                      >
                        Вернуть
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => patchMutation.mutate({ action: 'accept' })}
                        disabled={patchMutation.isPending}
                      >
                        Принять
                      </Button>
                    </div>
                  )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedComment(null)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
