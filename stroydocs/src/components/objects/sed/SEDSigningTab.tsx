'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import type { SEDDocumentFull, SEDApprovalStep } from './useSEDDocumentCard';

interface SEDSigningTabProps {
  doc: SEDDocumentFull;
  objectId: string;
  docId: string;
  onStartWorkflow: () => void;
  isWorkflowPending: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Стройконтроль',
  SUBCONTRACTOR: 'Субподрядчик',
};

const STEP_STATUS_CONFIG = {
  WAITING:  { dotClass: 'bg-yellow-400 border-yellow-500', label: 'Ожидает' },
  APPROVED: { dotClass: 'bg-green-500 border-green-600',  label: 'Согласовано' },
  REJECTED: { dotClass: 'bg-red-500 border-red-600',      label: 'Отклонено' },
} as const;

function ApprovalStepsList({
  steps,
  currentStepIdx,
}: {
  steps: SEDApprovalStep[];
  currentStepIdx: number | null;
}) {
  return (
    <div className="relative ml-3.5 space-y-0">
      {steps.map((step, idx) => {
        const isActive = currentStepIdx === idx;
        const config =
          STEP_STATUS_CONFIG[step.status as keyof typeof STEP_STATUS_CONFIG] ??
          STEP_STATUS_CONFIG.WAITING;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.id} className="relative flex gap-4 pb-5">
            {!isLast && <div className="absolute left-3 top-7 bottom-0 w-0.5 bg-border" />}
            <div className="relative flex-shrink-0 mt-0.5">
              <div
                className={cn(
                  'h-7 w-7 rounded-full border-2 flex items-center justify-center',
                  config.dotClass,
                  isActive && 'animate-pulse ring-2 ring-blue-500 ring-offset-2',
                )}
              >
                <span className="text-[10px] font-bold text-white">{idx + 1}</span>
              </div>
            </div>
            <div
              className={cn(
                'flex-1 rounded-md px-3 py-2',
                isActive ? 'bg-blue-50 border border-blue-200' : 'bg-transparent',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {ROLE_LABELS[step.role] ?? step.role}
                </span>
                {isActive && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">Текущий</Badge>
                )}
                <Badge variant="outline" className="text-xs ml-auto">
                  {config.label}
                </Badge>
              </div>
              {step.user && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.user.lastName} {step.user.firstName}
                </p>
              )}
              {step.decidedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(step.decidedAt).toLocaleDateString('ru-RU')}
                </p>
              )}
              {step.comment && (
                <p className="mt-1 text-xs text-muted-foreground italic">«{step.comment}»</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SEDSigningTab({
  doc,
  onStartWorkflow,
  isWorkflowPending,
}: SEDSigningTabProps) {
  const route = doc.approvalRoute;

  if (!route) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Маршрут согласования не запущен. Запустите его, чтобы отправить документ на согласование.
        </p>
        {(doc.status === 'DRAFT' || doc.status === 'ACTIVE') && (
          <Button onClick={onStartWorkflow} disabled={isWorkflowPending}>
            <Play className="h-4 w-4 mr-2" />
            {isWorkflowPending ? 'Запуск...' : 'Запустить согласование'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>
        {route.status === 'APPROVED' && (
          <Badge className="bg-green-100 text-green-800">Согласован</Badge>
        )}
        {route.status === 'REJECTED' && <Badge variant="destructive">Отклонён</Badge>}
        {route.status === 'PENDING' && <Badge variant="outline">В процессе</Badge>}
      </div>

      <ApprovalStepsList steps={route.steps} currentStepIdx={route.currentStepIdx} />

      {/* Кнопки действий — отображать при IN_APPROVAL */}
      {doc.status === 'IN_APPROVAL' && (
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" className="text-destructive hover:text-destructive">
            Отклонить
          </Button>
          <Button>Согласовать</Button>
          <Button variant="ghost">Перенаправить</Button>
        </div>
      )}
    </div>
  );
}
