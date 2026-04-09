'use client';

import { useState } from 'react';
import { RotateCcw, Play, CheckCircle2, Clock, XCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/utils/format';
import { useApproval } from './useApproval';
import { ApprovalDecideDialog } from './ApprovalDecideDialog';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Стройконтроль',
  SUBCONTRACTOR: 'Субподрядчик',
};

/** Конфигурация визуализации по статусу шага */
const STEP_CONFIG = {
  APPROVED: {
    Icon: CheckCircle2,
    iconClass: 'text-green-600',
    borderClass: 'border-l-green-500',
    label: 'Согласовано',
  },
  WAITING: {
    Icon: Clock,
    iconClass: 'text-yellow-600',
    borderClass: 'border-l-yellow-400',
    label: 'Ожидает',
  },
  REJECTED: {
    Icon: XCircle,
    iconClass: 'text-red-600',
    borderClass: 'border-l-red-500',
    label: 'Отклонено',
  },
  NOT_STARTED: {
    Icon: Circle,
    iconClass: 'text-muted-foreground',
    borderClass: 'border-l-gray-300',
    label: 'Не начат',
  },
} as const;

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
  docStatus: string;
}

/** Дерево согласования документа ИД — Card-based визуализация в стиле GitHub PR reviews */
export function ApprovalTree({ projectId, contractId, docId, docStatus }: Props) {
  const { route, isLoading, startMutation, resetMutation } = useApproval(projectId, contractId, docId);
  const [decideOpen, setDecideOpen] = useState(false);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-md bg-muted" />;
  }

  const canStart = !route || route.status === 'RESET';
  const canReset = route?.status === 'PENDING' || route?.status === 'REJECTED';
  const currentStep = route?.steps[route.currentStepIdx ?? 0];
  const isPending = route?.status === 'PENDING';

  return (
    <div className="space-y-4 rounded-md border p-4">
      {/* Заголовок и кнопки управления */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>
        <div className="flex gap-2">
          {canStart && docStatus !== 'SIGNED' && (
            <Button size="sm" variant="outline" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              <Play className="mr-1 h-3.5 w-3.5" />
              Запустить
            </Button>
          )}
          {isPending && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Сбросить
            </Button>
          )}
          {canReset && route?.status !== 'PENDING' && (
            <Button size="sm" variant="ghost" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Перезапустить
            </Button>
          )}
        </div>
      </div>

      {!route && (
        <p className="text-sm text-muted-foreground">
          Маршрут согласования не запущен. Запустите его, чтобы отправить документ на согласование.
        </p>
      )}

      {route && (
        <>
          {route.status === 'APPROVED' && <Badge className="bg-green-100 text-green-800">Согласован</Badge>}
          {route.status === 'REJECTED' && <Badge variant="destructive">Отклонён</Badge>}
          {route.status === 'RESET' && <Badge variant="secondary">Сброшен</Badge>}

          {/* Вертикальное дерево согласования */}
          <div className="relative space-y-3 ml-4">
            {route.steps.map((step, idx) => {
              const isActive = isPending && idx === route.currentStepIdx;
              // Шаги после текущего при PENDING — ещё не начаты
              const isNotStarted = isPending && idx > route.currentStepIdx;
              const configKey = isNotStarted ? 'NOT_STARTED' : step.status;
              const config = STEP_CONFIG[configKey];
              const isLast = idx === route.steps.length - 1;
              const { Icon } = config;

              return (
                <div key={step.id} className="relative">
                  {/* Вертикальная линия-соединитель */}
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-[-12px] w-0.5 bg-border" />
                  )}

                  <Card className={cn(
                    'border-l-4',
                    config.borderClass,
                    isActive && 'ring-2 ring-blue-500 ring-offset-1',
                  )}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ROLE_LABELS[step.role] || step.role}</span>
                          {isActive && <Badge className="bg-blue-100 text-blue-800 text-xs">Текущий</Badge>}
                          <Badge variant="outline" className="text-xs ml-auto">{config.label}</Badge>
                        </div>
                        {step.user && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.user.lastName} {step.user.firstName}
                            {step.user.position && ` — ${step.user.position}`}
                          </p>
                        )}
                        {step.decidedAt && (
                          <p className="text-xs text-muted-foreground">{formatDateTime(step.decidedAt)}</p>
                        )}
                        {step.comment && (
                          <p className="mt-1 text-xs text-muted-foreground italic">«{step.comment}»</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Кнопка принятия решения */}
          {isPending && currentStep?.status === 'WAITING' && (
            <Button size="sm" onClick={() => setDecideOpen(true)}>
              Принять решение
            </Button>
          )}
        </>
      )}

      <ApprovalDecideDialog
        open={decideOpen}
        onOpenChange={setDecideOpen}
        projectId={projectId}
        contractId={contractId}
        docId={docId}
        currentRole={currentStep ? (ROLE_LABELS[currentStep.role] || currentStep.role) : ''}
      />
    </div>
  );
}
