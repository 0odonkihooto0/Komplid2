'use client';

import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, Send } from 'lucide-react';
import { useWorkflowCard } from './useWorkflowCard';
import { RedirectDialog } from './RedirectDialog';
import type { SEDDocumentFull } from './useSEDDocumentCard';

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  DELEGATION: 'Делегирование',
  APPROVAL: 'Согласование',
  REDIRECT: 'Перенаправление',
  MULTI_APPROVAL: 'Мн. согласование',
  MULTI_SIGNING: 'Мн. подписание',
  DIGITAL_SIGNING: 'Подписание ЭП',
  REVIEW: 'Рассмотрение',
};

const STEP_CONFIG = {
  WAITING:  { dot: 'bg-yellow-400 border-yellow-500', badge: 'warning' as const,     label: 'Ожидает' },
  APPROVED: { dot: 'bg-green-500 border-green-600',  badge: 'success' as const,     label: 'Согласовано' },
  REJECTED: { dot: 'bg-red-500 border-red-600',      badge: 'destructive' as const, label: 'Отклонено' },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'> = {
  CREATED: 'outline', IN_PROGRESS: 'warning', APPROVED: 'success',
  REJECTED: 'destructive', COMPLETED: 'secondary',
};

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-36">{label}:</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

interface WorkflowCardProps {
  objectId: string;
  docId: string;
  workflowId: string;
  doc: SEDDocumentFull;
}

export function WorkflowCard({ objectId, docId, workflowId, doc }: WorkflowCardProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    workflow, isLoading, isCurrentParticipant,
    messageHtml, setMessageHtml,
    showRedirectDialog, setShowRedirectDialog,
    showRejectInline, setShowRejectInline,
    rejectComment, setRejectComment,
    approveMutation, rejectMutation, sendMessageMutation, createOnBasisMutation,
    invalidate,
  } = useWorkflowCard(objectId, docId, workflowId);

  const handleFormat = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
  };

  const handleSend = () => {
    const html = editorRef.current?.innerHTML ?? '';
    if (!html.trim() || html === '<br>') return;
    sendMessageMutation.mutate(html);
    if (editorRef.current) editorRef.current.innerHTML = '';
    setMessageHtml('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-[3] space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
        <div className="flex-[2] space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div>
      </div>
    );
  }

  if (!workflow) return null;

  const route = workflow.approvalRoute;
  const stepLabel = `${WORKFLOW_TYPE_LABELS[workflow.workflowType] ?? workflow.workflowType}` +
    (route?.currentStepIdx != null ? ` №${route.currentStepIdx + 1}` : '');

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Левая панель 60% — история + действия + чат */}
      <div className="flex-[3] flex flex-col overflow-hidden border-r">
        {/* Timeline маршрута */}
        <div className="overflow-y-auto p-4 space-y-1 max-h-64 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">История маршрута</p>
          {route?.steps.map((step, idx) => {
            const cfg = STEP_CONFIG[step.status as keyof typeof STEP_CONFIG] ?? STEP_CONFIG.WAITING;
            const isActive = route.currentStepIdx === idx;
            return (
              <div key={step.id} className="flex gap-3 items-start py-1">
                <div className={cn('h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5', cfg.dot, isActive && 'ring-2 ring-blue-500 ring-offset-1')}>
                  <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{step.user ? `${step.user.lastName} ${step.user.firstName}` : '—'}</span>
                    <Badge variant={cfg.badge} className="text-xs">{cfg.label}</Badge>
                    {step.decidedAt && <span className="text-xs text-muted-foreground">{new Date(step.decidedAt).toLocaleDateString('ru-RU')}</span>}
                  </div>
                  {step.comment && <p className="text-xs text-muted-foreground italic mt-0.5">«{step.comment}»</p>}
                </div>
              </div>
            );
          })}
          {!route?.steps.length && <p className="text-sm text-muted-foreground">Шаги маршрута отсутствуют</p>}
        </div>

        {/* Кнопки действий — только для участника текущего шага */}
        {isCurrentParticipant && (
          <div className="p-4 border-b space-y-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => approveMutation.mutate(undefined)} disabled={approveMutation.isPending}>✓ Согласовать</Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectInline(true)} disabled={rejectMutation.isPending}>✕ Отклонить</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRedirectDialog(true)}>↪ Перенаправить</Button>
            </div>
            {showRejectInline && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Причина отклонения (обязательно)"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(rejectComment)} disabled={!rejectComment.trim() || rejectMutation.isPending}>Отклонить</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowRejectInline(false); setRejectComment(''); }}>Отмена</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Чат */}
        <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Чат участников</p>
          <div className="flex-1 overflow-y-auto space-y-2">
            {workflow.messages.map((msg) => (
              <div key={msg.id} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{msg.author.lastName} {msg.author.firstName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
            ))}
            {!workflow.messages.length && <p className="text-sm text-muted-foreground">Сообщений пока нет</p>}
          </div>
          {/* Форматированный ввод */}
          <div className="border rounded-md shrink-0">
            <div className="flex gap-0.5 p-1 border-b bg-muted/30">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleFormat('bold')}><Bold className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleFormat('italic')}><Italic className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleFormat('underline')}><Underline className="h-3 w-3" /></Button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setMessageHtml(e.currentTarget.innerHTML)}
              className="p-2 min-h-[52px] text-sm outline-none"
              data-placeholder="Написать сообщение..."
            />
            <div className="flex justify-end p-1 border-t">
              <Button size="sm" onClick={handleSend} disabled={!messageHtml.trim() || sendMessageMutation.isPending}>
                <Send className="h-3 w-3 mr-1" />Отправить
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Правая панель 40% — поля ДО */}
      <div className="flex-[2] overflow-y-auto p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Поля документа</p>
        <div className="space-y-1.5 text-sm">
          <FieldRow label="Номер ДО" value={workflow.number} />
          <FieldRow label="Дата отправки" value={workflow.sentAt ? new Date(workflow.sentAt).toLocaleDateString('ru-RU') : null} />
          <FieldRow label="Тип ДО" value={WORKFLOW_TYPE_LABELS[workflow.workflowType]} />
          <FieldRow label="Организация-отправитель" value={doc.senderOrg.name} />
          <FieldRow label="Организация-получатель" value={doc.receiverOrg?.name} />
          <FieldRow label="Отправитель" value={doc.senderUser ? `${doc.senderUser.lastName} ${doc.senderUser.firstName}` : null} />
          <FieldRow label="Получатель" value={doc.receiverUser ? `${doc.receiverUser.lastName} ${doc.receiverUser.firstName}` : null} />
          <FieldRow label="Входящий №" value={doc.incomingNumber} />
          <FieldRow label="Исходящий №" value={doc.outgoingNumber} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Статус ДО</p>
          <Badge variant={STATUS_VARIANT[workflow.status] ?? 'outline'}>
            {stepLabel} — {workflow.status === 'IN_PROGRESS' ? 'На согласовании' : workflow.status}
          </Badge>
        </div>

        <Button variant="outline" className="w-full" onClick={() => createOnBasisMutation.mutate()} disabled={createOnBasisMutation.isPending}>
          Отправить в ДО
        </Button>
      </div>

      <RedirectDialog
        open={showRedirectDialog}
        onOpenChange={setShowRedirectDialog}
        objectId={objectId}
        docId={docId}
        workflowId={workflowId}
        onRedirected={invalidate}
      />
    </div>
  );
}
