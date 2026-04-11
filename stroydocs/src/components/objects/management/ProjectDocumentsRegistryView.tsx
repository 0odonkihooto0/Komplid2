'use client';

import { useState } from 'react';
import { Plus, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentCategorySidebar } from './DocumentCategorySidebar';
import { DocumentRegistryTable } from './DocumentRegistryTable';
import { CreateTypedDocumentDialog } from './CreateTypedDocumentDialog';
import { useDocumentsRegistry } from './useDocumentsRegistry';
import type { RegistryDocument } from './useDocumentsRegistry';

interface ProjectDocumentsRegistryViewProps {
  objectId: string;
}

export function ProjectDocumentsRegistryView({ objectId }: ProjectDocumentsRegistryViewProps) {
  const {
    documents,
    isLoading,
    total,
    selectedCategory,
    setSelectedCategory,
  } = useDocumentsRegistry(objectId);

  const [createOpen, setCreateOpen] = useState(false);

  const handleRowClick = (doc: RegistryDocument) => {
    // Навигация к документу в зависимости от типа сущности
    const routes: Record<RegistryDocument['entityType'], string> = {
      ExecutionDoc:         `/objects/${objectId}/id`,
      Ks2Act:               `/objects/${objectId}/contracts`,
      Ks3Certificate:       `/objects/${objectId}/contracts`,
      InspectionAct:        `/objects/${objectId}/sk/inspections`,
      Prescription:         `/objects/${objectId}/sk/inspections`,
      DefectRemediationAct: `/objects/${objectId}/sk/inspections`,
      DesignDocument:       `/objects/${objectId}/pir/design-task`,
      SEDDocument:          `/objects/${objectId}/sed`,
      ProjectDocument:      `/objects/${objectId}/project-management/documents`,
    };
    window.location.href = routes[doc.entityType];
  };

  return (
    <div className="flex h-[calc(100vh-200px)] overflow-hidden rounded-lg border bg-background">
      {/* Левая панель — категории */}
      <div className="w-60 shrink-0 border-r bg-muted/20">
        <DocumentCategorySidebar
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Правая часть — заголовок + таблица */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Строка с заголовком и кнопками */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {total > 0 ? `${total} документов` : 'Реестр документов'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              Создать типовые документы
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Создать документ
            </Button>
          </div>
        </div>

        {/* Таблица документов */}
        <div className="flex-1 overflow-auto">
          <DocumentRegistryTable
            documents={documents}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      <CreateTypedDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        objectId={objectId}
        category={selectedCategory}
      />
    </div>
  );
}
