'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionTree } from './SectionTree';
import { ModelVersionsTable } from './ModelVersionsTable';
import { UploadModelDialog } from './UploadModelDialog';
import { useSections } from './useSections';
import type { BimSection } from './useSections';
import { useModels } from './useModels';

interface ModelsViewProps {
  objectId: string;
}

export function ModelsView({ objectId }: ModelsViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const sectionsQuery = useSections(objectId);
  const modelsQuery = useModels(objectId, selectedSectionId);

  const sections = sectionsQuery.data ?? [];
  const models = modelsQuery.data ?? [];

  const selectedSectionName = selectedSectionId
    ? findSectionName(sections, selectedSectionId)
    : null;

  return (
    <div className="flex h-full min-h-0">
      {/* Левая панель — дерево разделов */}
      <div className="w-60 border-r flex-shrink-0 overflow-y-auto p-3">
        {sectionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground px-2">Загрузка...</p>
        ) : (
          <SectionTree
            sections={sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
            projectId={objectId}
          />
        )}
      </div>

      {/* Правая панель — список моделей */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedSectionName ? `Раздел: ${selectedSectionName}` : 'Все модели'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {models.length > 0
                ? `${models.length} ${pluralModels(models.length)}`
                : 'Нет загруженных моделей'}
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Загрузить IFC
          </Button>
        </div>

        <ModelVersionsTable
          models={models}
          isLoading={modelsQuery.isLoading}
          projectId={objectId}
        />
      </div>

      <UploadModelDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={objectId}
        sections={sections}
        defaultSectionId={selectedSectionId}
      />
    </div>
  );
}

// ─── Вспомогательные функции ─────────────────────────────────────────────────

function findSectionName(sections: BimSection[], id: string): string | null {
  for (const s of sections) {
    if (s.id === id) return s.name;
    const found = findSectionName(s.children, id);
    if (found) return found;
  }
  return null;
}

function pluralModels(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'модель';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'модели';
  return 'моделей';
}
