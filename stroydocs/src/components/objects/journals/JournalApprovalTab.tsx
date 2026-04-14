'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { FileSignature, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { ApprovalTimeline } from '@/components/modules/approval/ApprovalTimeline';
import type { ApprovalRoute } from '@/components/modules/approval/types';
import type { JournalDetail } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
  journal: JournalDetail;
}

export function JournalApprovalTab({ objectId, journalId, journal }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const workflowBaseUrl = `/api/projects/${objectId}/journals/${journalId}/workflow`;
  const queryKey = ['journal', objectId, journalId];

  // Мутация для запуска согласования из вкладки
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(workflowBaseUrl, { method: 'POST' });
      if (!res.ok) {
        const err: { error?: string } = await res.json();
        throw new Error(err.error ?? 'Ошибка запуска согласования');
      }
    },
    onSuccess: () => {
      toast({ title: 'Маршрут согласования запущен' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const route = journal.approvalRoute as ApprovalRoute | null;

  // Нет маршрута — empty-state
  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <FileSignature className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Согласование не запущено</p>
          <p className="text-sm text-muted-foreground mt-1">
            Запустите маршрут согласования, чтобы отправить журнал на подпись участникам
          </p>
        </div>
        <Button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending || journal.status !== 'ACTIVE'}
        >
          Запустить согласование
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* ЭЦП-заглушка: показывается когда маршрут полностью согласован */}
      {route.status === 'APPROVED' && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Журнал согласован всеми участниками</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Функция в разработке"
          >
            <FileSignature className="mr-1 h-4 w-4" />
            Подписать ЭЦП
          </Button>
        </div>
      )}

      <ApprovalTimeline
        route={route}
        workflowBaseUrl={workflowBaseUrl}
        queryKey={queryKey}
        currentUserId={currentUserId}
        canStop={route.status === 'PENDING'}
      />
    </div>
  );
}
