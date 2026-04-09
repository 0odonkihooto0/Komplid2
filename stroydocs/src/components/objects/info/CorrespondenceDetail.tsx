'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useCorrespondenceDetail } from './useCorrespondenceDetail';
import type { CorrespondenceStatus } from './useCorrespondenceList';

const STATUS_LABELS: Record<CorrespondenceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:       { label: 'Черновик',         variant: 'outline' },
  SENT:        { label: 'Отправлено',        variant: 'default' },
  READ:        { label: 'Прочитано',         variant: 'success' },
  IN_APPROVAL: { label: 'На согласовании',   variant: 'warning' },
  APPROVED:    { label: 'Согласовано',       variant: 'success' },
  REJECTED:    { label: 'Отклонено',         variant: 'destructive' },
  ARCHIVED:    { label: 'Архив',             variant: 'secondary' },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface Props {
  objectId: string;
  corrId: string;
}

export function CorrespondenceDetail({ objectId, corrId }: Props) {
  const router = useRouter();
  const { correspondence, isLoading, sendMutation, archiveMutation, deleteMutation } =
    useCorrespondenceDetail(objectId, corrId);

  const backUrl = `/objects/${objectId}/info/correspondence`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-80" />
        <div className="grid grid-cols-3 gap-6 mt-4">
          <div className="col-span-2 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!correspondence) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Письмо не найдено</p>
        <Button variant="link" onClick={() => router.push(backUrl)}>← Вернуться к списку</Button>
      </div>
    );
  }

  const { status } = correspondence;
  const st = STATUS_LABELS[status];
  const displayDate = correspondence.sentAt
    ? new Date(correspondence.sentAt).toLocaleDateString('ru-RU')
    : new Date(correspondence.createdAt).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-4">
      {/* Навигация */}
      <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        К списку переписки
      </Button>

      {/* Двухколоночный layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Шапка */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{correspondence.number}</span>
              <span className="text-sm text-muted-foreground">
                {correspondence.direction === 'OUTGOING' ? '→ Исходящее' : '← Входящее'}
              </span>
            </div>
            <h1 className="text-xl font-semibold">{correspondence.subject}</h1>
          </div>

          <Separator />

          {/* Метаданные */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">От</dt>
              <dd className="font-medium">{correspondence.senderOrg.name}</dd>
              {correspondence.senderOrg.inn && <dd className="text-xs text-muted-foreground">ИНН: {correspondence.senderOrg.inn}</dd>}
            </div>
            <div>
              <dt className="text-muted-foreground">Кому</dt>
              <dd className="font-medium">{correspondence.receiverOrg.name}</dd>
              {correspondence.receiverOrg.inn && <dd className="text-xs text-muted-foreground">ИНН: {correspondence.receiverOrg.inn}</dd>}
            </div>
            <div>
              <dt className="text-muted-foreground">Дата</dt>
              <dd>{displayDate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Автор</dt>
              <dd>{correspondence.author.lastName} {correspondence.author.firstName}</dd>
            </div>
            {correspondence.tags.length > 0 && (
              <div className="col-span-2">
                <dt className="text-muted-foreground mb-1">Теги</dt>
                <dd className="flex flex-wrap gap-1">
                  {correspondence.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {/* Текст письма */}
          {correspondence.body && (
            <>
              <Separator />
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {correspondence.body}
              </div>
            </>
          )}

          {/* Вложения */}
          {correspondence.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Paperclip className="h-4 w-4" aria-label="Вложения" />
                  Вложения ({correspondence.attachments.length})
                </p>
                <ul className="space-y-1">
                  {correspondence.attachments.map((att) => (
                    <li key={att.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                      <span className="truncate">{att.fileName}</span>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{formatBytes(att.size)}</span>
                        <a href={`/api/files/${att.s3Key}`} download={att.fileName}>
                          <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" aria-label="Скачать" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Правая колонка (1/3) */}
        <div className="space-y-4">
          {/* Статус */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Статус</p>
              <Badge variant={st.variant} className="text-sm px-3 py-1">{st.label}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Создано</p>
              <p className="text-sm">{new Date(correspondence.createdAt).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>

          {/* Действия */}
          <div className="space-y-2">
            {status === 'DRAFT' && (
              <>
                <Button
                  className="w-full"
                  disabled={sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                >
                  {sendMutation.isPending ? 'Отправка...' : 'Отправить'}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? 'Удаление...' : 'Удалить черновик'}
                </Button>
              </>
            )}
            {(status === 'SENT' || status === 'READ' || status === 'IN_APPROVAL') && (
              <Button
                variant="outline"
                className="w-full"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
              >
                {archiveMutation.isPending ? 'Архивация...' : 'В архив'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
