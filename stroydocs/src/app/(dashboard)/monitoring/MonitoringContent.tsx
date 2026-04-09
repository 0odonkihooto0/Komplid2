'use client';

import { useSession } from 'next-auth/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalMonitoringView } from '@/components/modules/reports/GlobalMonitoringView';
import { useGlobalMonitoring } from '@/components/modules/reports/useGlobalMonitoring';

export function MonitoringContent() {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId;

  const { refetch, isFetching } = useGlobalMonitoring(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Глобальный мониторинг</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Сводная карта состояния всех объектов организации
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {orgId && <GlobalMonitoringView orgId={orgId} />}

      {!orgId && (
        <p className="text-muted-foreground text-sm">Сессия не загружена. Обновите страницу.</p>
      )}
    </div>
  );
}
