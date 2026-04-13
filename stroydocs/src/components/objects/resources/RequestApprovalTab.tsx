'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { ApprovalTimeline } from '@/components/modules/approval/ApprovalTimeline';
import type { ApprovalRoute } from '@/components/modules/approval/types';
import type { RequestCardData } from './useRequestCard';

interface Props {
  objectId: string;
  requestId: string;
  request: RequestCardData;
  currentUserId: string;
}

export function RequestApprovalTab({ objectId, requestId, request, currentUserId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workflowBaseUrl = `/api/projects/${objectId}/material-requests/${requestId}/workflow`;
  const queryKey = ['material-request', objectId, requestId];

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(workflowBaseUrl, { method: 'POST' });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка запуска согласования');
    },
    onSuccess: () => {
      toast({ title: 'Согласование запущено' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const { approvalRoute } = request;

  // Нет маршрута — предлагаем запустить
  if (!approvalRoute) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-muted-foreground">
          Согласование не запущено. Нажмите кнопку чтобы создать маршрут согласования.
        </p>
        <Button
          size="sm"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
        >
          <PlayCircle className="h-4 w-4 mr-1.5" />
          {startMutation.isPending ? 'Запуск...' : 'Запустить согласование'}
        </Button>
      </div>
    );
  }

  const canRestart = approvalRoute.status === 'REJECTED' || approvalRoute.status === 'RESET';

  return (
    <div className="space-y-4 pt-2">
      {/* Кнопка перезапуска при отклонении/сбросе */}
      {canRestart && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {startMutation.isPending ? 'Перезапуск...' : 'Перезапустить согласование'}
          </Button>
        </div>
      )}

      <ApprovalTimeline
        route={approvalRoute as ApprovalRoute}
        workflowBaseUrl={workflowBaseUrl}
        queryKey={queryKey}
        currentUserId={currentUserId}
        canStop={approvalRoute.status === 'PENDING'}
      />
    </div>
  );
}
