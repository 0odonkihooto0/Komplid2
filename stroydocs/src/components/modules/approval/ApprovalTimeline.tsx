'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, History, Download, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ApprovalRoute } from './types';
import { STEP_STATUS_CONFIG, ROLE_LABELS } from './types';
import { ApprovalDecideDialog } from './ApprovalDecideDialog';

interface Props {
  route: ApprovalRoute;
  workflowBaseUrl: string;
  queryKey: unknown[];
  currentUserId: string;
  canStop: boolean; // разрешено ли останавливать (false если terminal)
}

const ROUTE_STATUS: Record<string, { label: string; cls: string; variant?: 'destructive' | 'secondary' | 'outline' }> = {
  PENDING:  { label: 'На согласовании', cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Согласован',      cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Отклонён',        cls: '',  variant: 'destructive' },
  RESET:    { label: 'Сброшен',         cls: '',  variant: 'secondary' },
};

export function ApprovalTimeline({ route, workflowBaseUrl, queryKey, currentUserId, canStop }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [decideState, setDecideState] = useState<{ decision: 'APPROVED' | 'REJECTED' } | null>(null);

  // Мутация остановки/сброса маршрута
  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(workflowBaseUrl, { method: 'DELETE' });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка остановки согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования остановлен' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Мутация принятия решения
  const decideMutation = useMutation({
    mutationFn: async ({ decision, comment }: { decision: 'APPROVED' | 'REJECTED'; comment?: string }) => {
      const res = await fetch(`${workflowBaseUrl}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment }),
      });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка принятия решения');
      }
    },
    onSuccess: () => {
      toast({ title: 'Решение зафиксировано' });
      queryClient.invalidateQueries({ queryKey });
      setDecideState(null);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const routeStatus = ROUTE_STATUS[route.status];
  const isPending = route.status === 'PENDING';
  const currentStep = isPending ? route.steps[route.currentStepIdx] : null;
  const isCurrentApprover = !!currentStep && currentStep.userId === currentUserId;

  return (
    <div className="space-y-3">
      {/* Тулбар: история / скачать / остановить */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
          <History className="mr-1.5 h-3.5 w-3.5" />
          История согласования
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Скачать лист согласования ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => toast({ title: 'Генерация листа согласования — в разработке' })}>
              Скачать PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isPending && canStop && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setStopOpen(true)}
            disabled={stopMutation.isPending}
          >
            <StopCircle className="mr-1.5 h-3.5 w-3.5" />
            Остановить согласование
          </Button>
        )}
      </div>

      {/* Бейдж статуса маршрута */}
      {routeStatus.variant ? (
        <Badge variant={routeStatus.variant}>{routeStatus.label}</Badge>
      ) : (
        <Badge className={cn(routeStatus.cls)}>{routeStatus.label}</Badge>
      )}

      {/* Вертикальный таймлайн шагов */}
      <div className="relative ml-3.5 space-y-0">
        {route.steps.map((step, idx) => {
          const isActive = isPending && idx === route.currentStepIdx;
          const config = STEP_STATUS_CONFIG[step.status];
          const isLast = idx === route.steps.length - 1;
          const isCurrentUserStep = isActive && step.userId === currentUserId;

          return (
            <div key={step.id} className="relative flex gap-4 pb-5">
              {/* Вертикальная соединительная линия */}
              {!isLast && (
                <div className="absolute bottom-0 left-3 top-7 w-0.5 bg-border" />
              )}

              {/* Индикатор статуса (круг с номером) */}
              <div className="relative mt-0.5 flex-shrink-0">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2',
                    config.dotClass,
                    isActive && 'animate-pulse ring-2 ring-blue-500 ring-offset-2',
                  )}
                >
                  <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                </div>
              </div>

              {/* Содержимое шага */}
              <div
                className={cn(
                  'flex-1 rounded-md px-3 py-2',
                  isActive ? 'border border-blue-200 bg-blue-50' : 'bg-transparent',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {ROLE_LABELS[step.role] ?? step.role}
                  </span>
                  {isActive && (
                    <Badge className="ml-auto bg-blue-100 text-xs text-blue-800">Текущий</Badge>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {config.label}
                  </Badge>
                </div>

                {step.user && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.user.lastName} {step.user.firstName}
                  </p>
                )}
                {step.decidedAt && (
                  <p className="text-xs text-muted-foreground">{formatDate(step.decidedAt)}</p>
                )}
                {step.comment && (
                  <p className="mt-1 text-xs italic text-muted-foreground">«{step.comment}»</p>
                )}

                {/* Кнопки действия для текущего участника */}
                {isCurrentUserStep && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 bg-green-600 text-xs hover:bg-green-700"
                      onClick={() => setDecideState({ decision: 'APPROVED' })}
                      disabled={decideMutation.isPending}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Согласовать
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setDecideState({ decision: 'REJECTED' })}
                      disabled={decideMutation.isPending}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Отклонить
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Диалог: история согласования */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>История согласования</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {route.steps.map((step) => (
              <div key={step.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ROLE_LABELS[step.role] ?? step.role}</span>
                  <Badge
                    variant={step.status === 'REJECTED' ? 'destructive' : 'outline'}
                    className={cn(
                      'text-xs',
                      step.status === 'APPROVED' && 'border-green-500 text-green-700',
                    )}
                  >
                    {STEP_STATUS_CONFIG[step.status].label}
                  </Badge>
                </div>
                {step.user && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {step.user.lastName} {step.user.firstName}
                  </p>
                )}
                {step.decidedAt && (
                  <p className="text-xs text-muted-foreground">{formatDate(step.decidedAt)}</p>
                )}
                {step.comment && (
                  <p className="mt-1 text-xs italic text-muted-foreground">«{step.comment}»</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: подтверждение остановки */}
      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Остановить согласование?</AlertDialogTitle>
            <AlertDialogDescription>
              Маршрут будет сброшен, документ вернётся в предыдущий статус.
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setStopOpen(false); stopMutation.mutate(); }}
            >
              Остановить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог принятия решения */}
      {decideState && (
        <ApprovalDecideDialog
          open={!!decideState}
          onOpenChange={(open) => { if (!open) setDecideState(null); }}
          decision={decideState.decision}
          isPending={decideMutation.isPending}
          onConfirm={(comment) =>
            decideMutation.mutate({ decision: decideState.decision, comment })
          }
        />
      )}
    </div>
  );
}
