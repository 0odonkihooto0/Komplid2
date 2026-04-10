'use client';

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { SEDSidebar } from './SEDSidebar';
import { SEDDocumentsTable } from './SEDDocumentsTable';
import { CreateSEDDialog } from './CreateSEDDialog';
import {
  useSEDList,
  type SEDView as SEDViewType,
  type SEDFilters,
  EMPTY_FILTERS,
} from './useSEDList';

export function SEDView({ objectId }: { objectId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedView, setSelectedView] = useState<SEDViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SEDFilters>(EMPTY_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requiresCount, setRequiresCount] = useState(0);

  const { items, total, isLoading, error } = useSEDList(objectId, {
    view: selectedView,
    folderId: selectedFolderId,
    search,
    filters,
  });

  // Счётчик "Требует действия" для badge в сайдбаре
  useEffect(() => {
    fetch(`/api/objects/${objectId}/sed?view=requires&limit=1`)
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { total?: number } }) => {
        if (j.success) setRequiresCount(j.data?.total ?? 0);
      })
      .catch(() => {});
  }, [objectId]);

  const handleBulkMarkRead = useCallback(
    async (ids: string[], isRead: boolean) => {
      try {
        const res = await fetch(`/api/objects/${objectId}/sed/mark-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentIds: ids, isRead }),
        });
        if (!res.ok) throw new Error();
        await queryClient.invalidateQueries({ queryKey: ['sed', objectId] });
      } catch {
        toast({
          title: 'Ошибка',
          description: 'Не удалось обновить статус прочтения',
          variant: 'destructive',
        });
      }
    },
    [objectId, queryClient, toast],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить документы СЭД</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <SEDSidebar
        objectId={objectId}
        selectedView={selectedView}
        selectedFolderId={selectedFolderId}
        requiresActionCount={requiresCount}
        onViewChange={setSelectedView}
        onFolderChange={setSelectedFolderId}
      />
      <SEDDocumentsTable
        objectId={objectId}
        items={items}
        isLoading={isLoading}
        total={total}
        filters={filters}
        onCreateDoc={() => setDialogOpen(true)}
        onSearch={setSearch}
        onFilterChange={setFilters}
        onBulkMarkRead={handleBulkMarkRead}
      />
      <CreateSEDDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        objectId={objectId}
      />
    </div>
  );
}
