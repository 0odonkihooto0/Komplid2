'use client';

import { useState } from 'react';
import { Plus, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityCategorySidebar } from './ActivityCategorySidebar';
import { ActivityDocumentTable } from './ActivityDocumentTable';
import { ConfigureCategoriesDialog } from './ConfigureCategoriesDialog';
import { CreateActivityDocumentDialog } from './CreateActivityDocumentDialog';
import { useActivityDocuments } from './useActivities';

interface ActivitiesViewProps {
  objectId: string;
}

export function ActivitiesView({ objectId }: ActivitiesViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [createOpen, setCreateOpen]       = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);

  const { data: documents = [], isLoading } = useActivityDocuments(
    objectId,
    selectedCategoryId !== 'all' ? selectedCategoryId : undefined,
  );

  return (
    <div className="flex h-[calc(100vh-200px)] overflow-hidden rounded-lg border bg-background">
      {/* Левая панель — категории */}
      <div className="w-60 shrink-0 border-r bg-muted/20">
        <ActivityCategorySidebar
          objectId={objectId}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onConfigureClick={() => setConfigureOpen(true)}
        />
      </div>

      {/* Правая часть — заголовок + таблица */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Строка с заголовком и кнопками */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {documents.length > 0
                ? `${documents.length} документов`
                : 'Перечень мероприятий'}
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Создать документ
          </Button>
        </div>

        {/* Таблица документов */}
        <div className="flex-1 overflow-auto">
          <ActivityDocumentTable
            documents={documents}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Диалог настройки категорий */}
      <ConfigureCategoriesDialog
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        objectId={objectId}
      />

      {/* Диалог создания документа */}
      <CreateActivityDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        objectId={objectId}
        preselectedCategoryId={selectedCategoryId !== 'all' ? selectedCategoryId : undefined}
      />
    </div>
  );
}
