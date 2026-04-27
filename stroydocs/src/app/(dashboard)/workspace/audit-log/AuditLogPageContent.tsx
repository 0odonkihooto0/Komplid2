'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AuditLogFilters } from '@/components/audit/AuditLogFilters';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditLogFilters as Filters } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditLogPageContent() {
  const { data: session } = useSession();
  const workspaceId = session?.user?.activeWorkspaceId ?? '';

  const [filters, setFilters] = useState<Filters>({ page: 1, take: 50 });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError } = useAuditLog(workspaceId, filters);

  const entries = data?.data ?? [];
  const meta = data?.meta;

  const handleExportCsv = useCallback(async () => {
    if (!workspaceId) return;
    setIsExporting(true);
    try {
      // Формируем CSV из текущей страницы
      const headers = ['Дата', 'Кто', 'Email', 'Событие', 'Ресурс', 'ID ресурса', 'IP'];
      const rows = entries.map((e) => [
        new Date(e.createdAt).toISOString(),
        e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : 'Система',
        e.actor?.email ?? '',
        e.action,
        e.resourceType ?? '',
        e.resourceId ?? '',
        e.ipAddress ?? '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [entries, workspaceId]);

  if (isError) {
    return (
      <div className="py-12 text-center text-destructive text-sm">
        Не удалось загрузить журнал аудита. Проверьте подключение и права доступа.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AuditLogFilters
        filters={filters}
        onChange={setFilters}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      <AuditLogTable entries={entries} isLoading={isLoading} />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Страница {meta.page} из {meta.totalPages} &middot; {meta.total} событий
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
