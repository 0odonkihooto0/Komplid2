'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useEstimatePreview } from '@/components/modules/estimates/useEstimatePreview';
import { EstimatePreviewTable } from '@/components/modules/estimates/EstimatePreviewTable';
import { EstimatePreviewActions } from '@/components/modules/estimates/EstimatePreviewActions';
import { ImportStatusBadge } from '@/components/modules/estimates/EstimateStatusBadge';
import { ESTIMATE_FORMAT_LABELS } from '@/utils/constants';
import type { EstimateFormat, EstimateImportStatus } from '@prisma/client';

export default function EstimatePreviewPage() {
  const params = useParams<{
    projectId: string;
    contractId: string;
    importId: string;
  }>();
  const router = useRouter();
  const { projectId, contractId, importId } = params;

  const {
    estimateImport,
    isLoading,
    updateItemMutation,
    confirmMutation,
    deleteMutation,
  } = useEstimatePreview(projectId, contractId, importId);

  // Привязывать ли КСИ при импорте (необязательно, по умолчанию выключено)
  const [applyKsi, setApplyKsi] = useState(false);

  const items = useMemo(() => estimateImport?.items ?? [], [estimateImport]);
  const isReadOnly = estimateImport?.status === 'CONFIRMED';

  // ID всех работ (не материалов) — доступны для выбора
  const workItemIds = useMemo(
    () => items.filter((i) => i.itemType !== 'MATERIAL').map((i) => i.id),
    [items]
  );

  // По умолчанию все работы выбраны
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // При загрузке данных инициализируем выбор всех работ
  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds.size === 0 && workItemIds.length > 0) {
      return new Set(workItemIds);
    }
    return selectedIds;
  }, [selectedIds, workItemIds]);

  const handleBack = () => {
    router.push(`/projects/${projectId}/contracts/${contractId}`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      // Если ещё не инициализировано — стартуем с "все выбраны"
      const base = prev.size === 0 ? new Set(workItemIds) : new Set(prev);
      if (base.has(id)) { base.delete(id); } else { base.add(id); }
      return base;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const base = prev.size === 0 ? new Set(workItemIds) : prev;
      const allSelected = workItemIds.length > 0 && workItemIds.every((id) => base.has(id));
      return allSelected ? new Set() : new Set(workItemIds);
    });
  };

  const handleUpdateItem = (itemId: string, data: Record<string, unknown>) => {
    updateItemMutation.mutate({ itemId, data });
  };

  const handleConfirm = () => {
    const selectedItemIds = Array.from(effectiveSelectedIds);
    confirmMutation.mutate(
      { selectedItemIds, applyKsi },
      { onSuccess: () => handleBack() }
    );
  };

  const handleCancel = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => handleBack(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!estimateImport) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Импорт не найден</p>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к договору
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Шапка */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold">
                Предпросмотр: {estimateImport.fileName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {estimateImport.format
                  ? ESTIMATE_FORMAT_LABELS[estimateImport.format as EstimateFormat]
                  : '—'}
                {' · '}
                {new Date(estimateImport.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
          <ImportStatusBadge status={estimateImport.status as EstimateImportStatus} />
        </div>

        {/* Опция привязки КСИ */}
        {!isReadOnly && (
          <div className="mt-3 flex items-center gap-2">
            <Checkbox
              id="apply-ksi"
              checked={applyKsi}
              onCheckedChange={(v) => setApplyKsi(!!v)}
            />
            <label
              htmlFor="apply-ksi"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Привязать КСИ при импорте
            </label>
          </div>
        )}
      </div>

      {/* Таблица позиций */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground">Нет позиций</p>
        ) : (
          <EstimatePreviewTable
            items={items}
            isReadOnly={isReadOnly}
            selectedIds={effectiveSelectedIds}
            applyKsi={applyKsi}
            onUpdateItem={handleUpdateItem}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        )}
      </div>

      {/* Панель действий */}
      <EstimatePreviewActions
        selectedCount={effectiveSelectedIds.size}
        isConfirming={confirmMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isReadOnly={isReadOnly}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
