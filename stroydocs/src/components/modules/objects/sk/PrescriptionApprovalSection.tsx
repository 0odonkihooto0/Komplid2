'use client';

import { useState } from 'react';
import { Play, RotateCcw, CheckCircle2, Clock, XCircle, Circle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import {
  useStartPrescriptionApproval,
  useDecidePrescriptionApproval,
  useResetPrescriptionApproval,
  type ApprovalRouteData,
} from './usePrescriptions';

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Стройконтроль',
  SUBCONTRACTOR: 'Субподрядчик',
};

const STEP_CONFIG = {
  APPROVED: { Icon: CheckCircle2, iconClass: 'text-green-600', borderClass: 'border-l-green-500', label: 'Согласовано' },
  WAITING:  { Icon: Clock,        iconClass: 'text-yellow-600', borderClass: 'border-l-yellow-400', label: 'Ожидает' },
  REJECTED: { Icon: XCircle,      iconClass: 'text-red-600',    borderClass: 'border-l-red-500',    label: 'Отклонено' },
  NOT_STARTED: { Icon: Circle,    iconClass: 'text-muted-foreground', borderClass: 'border-l-gray-300', label: 'Не начат' },
} as const;

interface Props {
  objectId: string;
  prescriptionId: string;
  prescriptionNumber: string;
  approvalRoute: ApprovalRouteData | null;
}

/** Блок согласования предписания — аналог ApprovalTree для ИД */
export function PrescriptionApprovalSection({ objectId, prescriptionId, prescriptionNumber, approvalRoute }: Props) {
  const [decideOpen, setDecideOpen] = useState(false);
  const [comment, setComment] = useState('');

  const startMutation = useStartPrescriptionApproval(objectId, prescriptionId);
  const decideMutation = useDecidePrescriptionApproval(objectId, prescriptionId);
  const resetMutation = useResetPrescriptionApproval(objectId, prescriptionId);

  const route = approvalRoute;
  const canStart = !route || route.status === 'RESET';
  const isPending = route?.status === 'PENDING';
  const canReset = isPending || route?.status === 'REJECTED';
  const currentStep = route?.steps[route.currentStepIdx ?? 0];

  const handleDecide = async (decision: 'APPROVED' | 'REJECTED') => {
    await decideMutation.mutateAsync({ decision, comment: comment || undefined });
    setComment('');
    setDecideOpen(false);
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Маршрут согласования</h3>
        <div className="flex gap-2">
          {canStart && (
            <Button size="sm" variant="outline" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Запустить
            </Button>
          )}
          {canReset && !canStart && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {!route && (
        <p className="text-sm text-muted-foreground">
          Маршрут согласования не запущен. Нажмите «Запустить», чтобы отправить предписание №{prescriptionNumber} на согласование.
        </p>
      )}

      {route && (
        <>
          {route.status === 'APPROVED' && <Badge className="bg-green-100 text-green-800">Согласовано</Badge>}
          {route.status === 'REJECTED' && <Badge variant="destructive">Отклонено</Badge>}
          {route.status === 'RESET' && <Badge variant="secondary">Сброшен</Badge>}

          <div className="relative space-y-3 ml-4">
            {route.steps.map((step, idx) => {
              const isActive = isPending && idx === route.currentStepIdx;
              const isNotStarted = isPending && idx > route.currentStepIdx;
              const configKey = isNotStarted ? 'NOT_STARTED' : step.status;
              const config = STEP_CONFIG[configKey];
              const isLast = idx === route.steps.length - 1;
              const { Icon } = config;

              return (
                <div key={step.id} className="relative">
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-[-12px] w-0.5 bg-border" />
                  )}
                  <Card className={cn('border-l-4', config.borderClass, isActive && 'ring-2 ring-blue-500 ring-offset-1')}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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

          {isPending && currentStep?.status === 'WAITING' && (
            <Button size="sm" onClick={() => setDecideOpen(true)}>
              Принять решение
            </Button>
          )}
        </>
      )}

      {/* Диалог принятия решения */}
      <Dialog open={decideOpen} onOpenChange={setDecideOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Решение по согласованию</DialogTitle>
            <DialogDescription className="sr-only">
              Примите решение по текущему шагу согласования предписания
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Предписание: <span className="font-medium text-foreground">№{prescriptionNumber}</span>
            </p>
            {currentStep && (
              <p className="text-sm text-muted-foreground">
                Текущий шаг: <span className="font-medium text-foreground">{ROLE_LABELS[currentStep.role] || currentStep.role}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="decide-comment">Комментарий (необязательно)</Label>
              <Textarea
                id="decide-comment"
                placeholder="Добавьте комментарий к решению..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => handleDecide('REJECTED')}
              disabled={decideMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Отклонить
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleDecide('APPROVED')}
              disabled={decideMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Согласовать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
