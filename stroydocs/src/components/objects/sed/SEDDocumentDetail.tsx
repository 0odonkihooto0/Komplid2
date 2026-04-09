'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Paperclip, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSEDDetail, type SEDApprovalStep } from './useSEDDetail';
import type { SEDStatus } from './useSEDList';

const DOC_TYPE_LABELS: Record<string, string> = {
  LETTER: 'Письмо', ORDER: 'Приказ', PROTOCOL: 'Протокол',
  ACT: 'Акт', MEMO: 'Докладная', NOTIFICATION: 'Уведомление', OTHER: 'Иное',
};

const STATUS_LABELS: Record<SEDStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  DRAFT:           { label: 'Черновик',          variant: 'outline' },
  ACTIVE:          { label: 'Активный',          variant: 'default' },
  IN_APPROVAL:     { label: 'На согласовании',   variant: 'warning' },
  REQUIRES_ACTION: { label: 'Требует действия',  variant: 'warning' },
  APPROVED:        { label: 'Согласован',        variant: 'success' },
  REJECTED:        { label: 'Отклонён',          variant: 'destructive' },
  ARCHIVED:        { label: 'Архив',             variant: 'secondary' },
};

const STEP_STATUS_CONFIG = {
  WAITING:  { dotClass: 'bg-yellow-400 border-yellow-500', label: 'Ожидает' },
  APPROVED: { dotClass: 'bg-green-500 border-green-600',  label: 'Согласовано' },
  REJECTED: { dotClass: 'bg-red-500 border-red-600',      label: 'Отклонено' },
};

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик', CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Стройконтроль', SUBCONTRACTOR: 'Субподрядчик',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function ApprovalStepsList({ steps, currentStepIdx }: { steps: SEDApprovalStep[]; currentStepIdx: number | null }) {
  return (
    <div className="relative ml-3.5 space-y-0">
      {steps.map((step, idx) => {
        const isActive = currentStepIdx === idx;
        const config = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.WAITING;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.id} className="relative flex gap-4 pb-5">
            {!isLast && <div className="absolute left-3 top-7 bottom-0 w-0.5 bg-border" />}
            <div className="relative flex-shrink-0 mt-0.5">
              <div className={cn('h-7 w-7 rounded-full border-2 flex items-center justify-center', config.dotClass, isActive && 'animate-pulse ring-2 ring-blue-500 ring-offset-2')}>
                <span className="text-[10px] font-bold text-white">{idx + 1}</span>
              </div>
            </div>
            <div className={cn('flex-1 rounded-md px-3 py-2', isActive ? 'bg-blue-50 border border-blue-200' : 'bg-transparent')}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ROLE_LABELS[step.role] ?? step.role}</span>
                {isActive && <Badge className="bg-blue-100 text-blue-800 text-xs">Текущий</Badge>}
                <Badge variant="outline" className="text-xs ml-auto">{config.label}</Badge>
              </div>
              {step.user && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.user.lastName} {step.user.firstName}</p>
              )}
              {step.decidedAt && (
                <p className="text-xs text-muted-foreground">{new Date(step.decidedAt).toLocaleDateString('ru-RU')}</p>
              )}
              {step.comment && <p className="mt-1 text-xs text-muted-foreground italic">«{step.comment}»</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  objectId: string;
  docId: string;
}

export function SEDDocumentDetail({ objectId, docId }: Props) {
  const router = useRouter();
  const { doc, isLoading, patchMutation, startWorkflowMutation } = useSEDDetail(objectId, docId);
  const backUrl = `/objects/${objectId}/sed`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-80" />
        <div className="grid grid-cols-3 gap-6 mt-4">
          <div className="col-span-2 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Документ не найден</p>
        <Button variant="link" onClick={() => router.push(backUrl)}>← Вернуться к списку</Button>
      </div>
    );
  }

  const st = STATUS_LABELS[doc.status];
  const canActivate = doc.status === 'DRAFT';
  const canStartWorkflow = doc.status === 'DRAFT' || doc.status === 'ACTIVE';
  const canArchive = doc.status === 'ACTIVE' || doc.status === 'APPROVED';

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        К списку СЭД
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{doc.number}</span>
              <span className="text-sm text-muted-foreground">{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</span>
            </div>
            <h1 className="text-xl font-semibold">{doc.title}</h1>
          </div>
          <Separator />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Отправитель</dt>
              <dd className="font-medium">{doc.senderOrg.name}</dd>
              {doc.senderOrg.inn && <dd className="text-xs text-muted-foreground">ИНН: {doc.senderOrg.inn}</dd>}
            </div>
            <div>
              <dt className="text-muted-foreground">Дата создания</dt>
              <dd>{new Date(doc.createdAt).toLocaleDateString('ru-RU')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Автор</dt>
              <dd>{doc.author.lastName} {doc.author.firstName}</dd>
            </div>
            {doc.tags.length > 0 && (
              <div className="col-span-2">
                <dt className="text-muted-foreground mb-1">Теги</dt>
                <dd className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </dd>
              </div>
            )}
          </dl>

          {doc.body && (
            <>
              <Separator />
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">{doc.body}</div>
            </>
          )}

          {doc.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Paperclip className="h-4 w-4" aria-label="Вложения" />
                  Вложения ({doc.attachments.length})
                </p>
                <ul className="space-y-1">
                  {doc.attachments.map((att) => (
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

        {/* Правая колонка */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Статус</p>
              <Badge variant={st.variant} className="text-sm px-3 py-1">{st.label}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            {canActivate && (
              <Button className="w-full" variant="outline" disabled={patchMutation.isPending} onClick={() => patchMutation.mutate({ status: 'ACTIVE' })}>
                {patchMutation.isPending ? 'Активация...' : 'Активировать'}
              </Button>
            )}
            {canStartWorkflow && (
              <Button className="w-full" disabled={startWorkflowMutation.isPending} onClick={() => startWorkflowMutation.mutate()}>
                <Play className="h-4 w-4 mr-1" />
                {startWorkflowMutation.isPending ? 'Запуск...' : 'Запустить согласование'}
              </Button>
            )}
            {canArchive && (
              <Button variant="outline" className="w-full" disabled={patchMutation.isPending} onClick={() => patchMutation.mutate({ status: 'ARCHIVED' })}>
                {patchMutation.isPending ? 'Архивация...' : 'В архив'}
              </Button>
            )}
          </div>

          {/* Маршрут согласования */}
          {doc.approvalRoute && (
            <div className="rounded-md border p-4 space-y-3">
              <h3 className="text-sm font-medium">Маршрут согласования</h3>
              {doc.approvalRoute.status === 'APPROVED' && <Badge className="bg-green-100 text-green-800">Согласован</Badge>}
              {doc.approvalRoute.status === 'REJECTED' && <Badge variant="destructive">Отклонён</Badge>}
              <ApprovalStepsList
                steps={doc.approvalRoute.steps}
                currentStepIdx={doc.approvalRoute.currentStepIdx}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
