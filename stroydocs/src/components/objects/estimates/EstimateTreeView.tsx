'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Search } from 'lucide-react';
import { useEstimateTree } from '@/hooks/useEstimateTree';
import { useEstimateTreeView } from './useEstimateTreeView';
import { EstimateTreeToolbar } from './EstimateTreeToolbar';
import { EstimateTreeTable } from './EstimateTreeTable';
import { EstimateItemEditDialog } from './EstimateItemEditDialog';
import { EstimateHistoryDialog } from './EstimateHistoryDialog';
import { Button } from '@/components/ui/button';

// Форматирование суммы в рублях
const formatRub = (amount: number | null) => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface Props {
  objectId: string;
  contractId: string;
  versionId: string;
}

/** Иерархическая таблица просмотра/редактирования сметы */
export function EstimateTreeView({ objectId, contractId, versionId }: Props) {
  const tree = useEstimateTree({ projectId: objectId, contractId, versionId });
  const view = useEstimateTreeView(tree);
  const { version, isLoading } = tree;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
      </div>
    );
  }

  if (!version) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Версия сметы не найдена
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Тулбар: шапка + меню + кнопки действий */}
      <EstimateTreeToolbar
        objectId={objectId}
        versionName={version.name}
        status={version.status}
        format={version.sourceImport?.format ?? null}
        editMode={view.editMode}
        isBaseline={version.isBaseline}
        isToggling={view.isToggling}
        coefficients={version.coefficients}
        onToggleEditMode={() => void view.toggleEditMode()}
        onRecalculate={() => tree.recalculate.mutate()}
        onRenumber={() => tree.renumber.mutate()}
        onExportTemplate={() => tree.exportTemplate.mutate()}
        onShowHistory={() => view.setHistoryOpen(true)}
        onAddChapter={() => view.setAddingChapter(true)}
      />

      {/* Предупреждение для базовой версии */}
      {version.isBaseline && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Базовая версия доступна только для просмотра — редактирование запрещено.
          </AlertDescription>
        </Alert>
      )}

      {/* Поиск */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по позициям..."
          value={view.search}
          onChange={(e) => view.setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Инлайн-форма добавления раздела */}
      {view.addingChapter && (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <Input
            autoFocus
            placeholder="Название раздела..."
            value={view.newChapterName}
            onChange={(e) => view.setNewChapterName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void view.handleAddChapter();
              if (e.key === 'Escape') { view.setAddingChapter(false); view.setNewChapterName(''); }
            }}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={() => void view.handleAddChapter()} disabled={tree.addChapter.isPending}>
            Добавить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { view.setAddingChapter(false); view.setNewChapterName(''); }}>
            Отмена
          </Button>
        </div>
      )}

      {/* Иерархическая таблица сметы */}
      <EstimateTreeTable
        chapters={version.chapters}
        editMode={view.editMode}
        search={view.search}
        readOnly={version.isBaseline}
        projectId={objectId}
        contractId={contractId}
        versionId={versionId}
        onEditItem={view.openEditDialog}
      />

      {/* Итоговая строка */}
      <div className="flex justify-end gap-6 border-t pt-3 text-sm font-medium">
        <span className="text-muted-foreground">Труд:</span>
        <span className="tabular-nums">{formatRub(version.totalLabor)}</span>
        <span className="text-muted-foreground">Материалы:</span>
        <span className="tabular-nums">{formatRub(version.totalMat)}</span>
        <span className="text-muted-foreground font-semibold">Итого:</span>
        <span className="tabular-nums font-bold text-lg">{formatRub(version.totalAmount)}</span>
      </div>

      {/* Диалог редактирования позиции */}
      <EstimateItemEditDialog
        open={!!view.editDialogItem}
        item={view.editDialogItem}
        coefficients={version.coefficients}
        projectId={objectId}
        contractId={contractId}
        versionId={versionId}
        onClose={view.closeEditDialog}
      />

      {/* Диалог истории изменений */}
      <EstimateHistoryDialog
        open={view.historyOpen}
        onOpenChange={view.setHistoryOpen}
        projectId={objectId}
        contractId={contractId}
        versionId={versionId}
      />
    </div>
  );
}
