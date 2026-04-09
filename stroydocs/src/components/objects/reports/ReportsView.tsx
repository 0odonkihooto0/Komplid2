'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useReportsList } from './useReportsList';
import { ReportCategoryTree } from './ReportCategoryTree';
import { ReportsTable } from './ReportsTable';
import { CreateReportDialog } from './CreateReportDialog';
import { CreateFromTemplateDialog } from './CreateFromTemplateDialog';

interface ReportsViewProps {
  objectId: string;
}

export function ReportsView({ objectId }: ReportsViewProps) {
  const {
    categories,
    categoriesLoading,
    createCategory,
    renameCategory,
    deleteCategory,
    reports,
    reportsLoading,
    reportsTotal,
    selectedCategoryId,
    setSelectedCategoryId,
    createOpen,
    setCreateOpen,
    createFromTemplateOpen,
    setCreateFromTemplateOpen,
    createReport,
    createFromTemplate,
  } = useReportsList(objectId);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* ─── Левая панель: дерево категорий ─────────────────────────────────── */}
      <div className="w-60 shrink-0 overflow-hidden rounded-lg border bg-card">
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Загрузка...
          </div>
        ) : (
          <ReportCategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onCreateCategory={(payload) => createCategory.mutate(payload)}
            onRenameCategory={(payload) => renameCategory.mutate(payload)}
            onDeleteCategory={(id) => deleteCategory.mutate(id)}
            isCreating={createCategory.isPending}
            isRenaming={renameCategory.isPending}
            isDeleting={deleteCategory.isPending}
          />
        )}
      </div>

      {/* ─── Правая панель: список отчётов ───────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Заголовок + кнопки */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Информационные отчёты</h2>
            {!reportsLoading && (
              <Badge variant="secondary" className="text-xs">
                {reportsTotal}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateFromTemplateOpen(true)}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              Из шаблона
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Создать
            </Button>
          </div>
        </div>

        {/* Таблица */}
        <div className="flex-1 overflow-auto">
          <ReportsTable
            objectId={objectId}
            reports={reports}
            isLoading={reportsLoading}
          />
        </div>
      </div>

      {/* ─── Диалоги ─────────────────────────────────────────────────────────── */}
      <CreateReportDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onSubmit={(payload) => createReport.mutate(payload)}
        isPending={createReport.isPending}
      />

      <CreateFromTemplateDialog
        open={createFromTemplateOpen}
        onOpenChange={setCreateFromTemplateOpen}
        categories={categories}
        onSubmit={(payload) => createFromTemplate.mutate(payload)}
        isPending={createFromTemplate.isPending}
      />
    </div>
  );
}
