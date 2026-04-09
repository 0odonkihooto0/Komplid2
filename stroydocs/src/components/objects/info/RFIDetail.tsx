'use client';

import { useState } from 'react';
import { ArrowLeft, Paperclip, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { RFIAnswerForm } from './RFIAnswerForm';
import { useRFIDetail } from './useRFIDetail';
import type { RFIStatus, RFIPriority } from './useRFIList';
import { useSession } from 'next-auth/react';

const PRIORITY_BADGE: Record<RFIPriority, { label: string; className: string }> = {
  URGENT: { label: 'Срочный',  className: 'bg-red-100 text-red-700 border-red-300' },
  HIGH:   { label: 'Высокий',  className: 'bg-orange-100 text-orange-700 border-orange-300' },
  MEDIUM: { label: 'Средний',  className: 'bg-blue-100 text-blue-700 border-blue-300' },
  LOW:    { label: 'Низкий',   className: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const STATUS_BADGE: Record<RFIStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  OPEN:       { label: 'Открыт',           variant: 'outline' },
  IN_REVIEW:  { label: 'На рассмотрении',  variant: 'warning' },
  ANSWERED:   { label: 'Ответ дан',        variant: 'success' },
  CLOSED:     { label: 'Закрыт',           variant: 'secondary' },
  CANCELLED:  { label: 'Отменён',          variant: 'destructive' },
};

function formatName(u: { firstName: string; lastName: string }) {
  return `${u.lastName} ${u.firstName}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

interface Props {
  objectId: string;
  rfiId: string;
}

export function RFIDetail({ objectId, rfiId }: Props) {
  const { data: session } = useSession();
  const { rfi, isLoading, answerMutation, closeMutation, goBack } = useRFIDetail(objectId, rfiId);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Все хуки объявлены ДО ранних return
  const currentUserId = session?.user?.id;
  const isAuthor = rfi?.author.id === currentUserId;
  const isAssignee = rfi?.assignee?.id === currentUserId;
  const canAnswer = isAssignee && (rfi?.status === 'OPEN' || rfi?.status === 'IN_REVIEW');
  const canClose = isAuthor && rfi?.status !== 'CLOSED' && rfi?.status !== 'CANCELLED';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!rfi) {
    return <p className="text-muted-foreground">Вопрос не найден.</p>;
  }

  const priorityCfg = PRIORITY_BADGE[rfi.priority];
  const statusCfg = STATUS_BADGE[rfi.status];

  return (
    <div className="space-y-6">
      {/* Навигация назад */}
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-label="Назад" />
        К списку вопросов
      </button>

      {/* Шапка */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">{rfi.number}</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityCfg.className}`}>
            {priorityCfg.label}
          </span>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        <h1 className="text-xl font-semibold">{rfi.title}</h1>
      </div>

      {/* Двухколоночный layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка — основное содержимое */}
        <div className="lg:col-span-2 space-y-6">
          {/* Описание */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Описание</h2>
            <p className="text-sm whitespace-pre-wrap">{rfi.description}</p>
          </div>

          {/* Вложения */}
          {rfi.attachments.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Вложения</h2>
              <ul className="space-y-1">
                {rfi.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-label="Вложение" />
                    <span>{a.fileName}</span>
                    <span className="text-muted-foreground text-xs">({formatSize(a.size)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Блок ответа */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Ответ</h2>
            {(rfi.status === 'ANSWERED' || rfi.status === 'CLOSED') && rfi.response ? (
              <div className="rounded-lg border bg-green-50 border-green-200 p-4 space-y-1">
                <p className="text-sm whitespace-pre-wrap">{rfi.response}</p>
                {rfi.answeredBy && rfi.answeredAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Ответил: {formatName(rfi.answeredBy)} · {new Date(rfi.answeredAt).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            ) : canAnswer ? (
              <RFIAnswerForm
                onAnswer={(response) => answerMutation.mutate(response)}
                isPending={answerMutation.isPending}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {rfi.assignee
                  ? `Ожидается ответ от ${formatName(rfi.assignee)}`
                  : 'Исполнитель не назначен'}
              </p>
            )}
          </div>
        </div>

        {/* Правая колонка — метаданные и действия */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Информация</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Автор</span>
                <span>{formatName(rfi.author)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Исполнитель</span>
                <span>{rfi.assignee ? formatName(rfi.assignee) : '—'}</span>
              </div>
              {rfi.deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Срок ответа</span>
                  <span>{new Date(rfi.deadline).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Создан</span>
                <span>{new Date(rfi.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
          </div>

          {/* Действия автора */}
          {canClose && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCloseDialogOpen(true)}
              >
                <X className="h-4 w-4 mr-1" aria-label="Закрыть" />
                Закрыть RFI
              </Button>
              <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Закрыть вопрос?</DialogTitle>
                    <DialogDescription>
                      RFI будет переведён в статус «Закрыт». Это действие нельзя отменить.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button
                      onClick={() => { closeMutation.mutate(); setCloseDialogOpen(false); }}
                      disabled={closeMutation.isPending}
                    >
                      Закрыть
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
