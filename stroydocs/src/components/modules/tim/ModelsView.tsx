'use client';

import { useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SectionTree } from './SectionTree';
import { ModelVersionsTable } from './ModelVersionsTable';
import { UploadModelDialog } from './UploadModelDialog';
import { useSections } from './useSections';
import type { BimSection } from './useSections';
import { useModels } from './useModels';
import type { BimModelItem } from './useModels';

interface ModelsViewProps {
  objectId: string;
}

export function ModelsView({ objectId }: ModelsViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  // Mobile (<768px): дерево разделов в Sheet-drawer вместо боковой панели
  const [sectionsOpen, setSectionsOpen] = useState(false);
  // При «Загрузить новую версию» из меню ⋮ — пред-заполняем имя и раздел
  const [uploadDefaults, setUploadDefaults] = useState<{
    name?: string; sectionId?: string | null;
  }>({});

  const sectionsQuery = useSections(objectId);
  const modelsQuery = useModels(objectId, selectedSectionId);

  const sections = sectionsQuery.data ?? [];
  const models = modelsQuery.data ?? [];

  const selectedSectionName = selectedSectionId
    ? findSectionName(sections, selectedSectionId)
    : null;

  const openUploadFresh = () => {
    setUploadDefaults({ sectionId: selectedSectionId });
    setUploadOpen(true);
  };

  const openUploadNewVersion = (model: BimModelItem) => {
    setUploadDefaults({ name: model.name, sectionId: model.section?.id ?? null });
    setUploadOpen(true);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Левая панель — дерево разделов (десктоп) */}
      <div className="hidden md:flex w-60 border-r flex-shrink-0 overflow-y-auto p-3">
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

      {/* Mobile drawer (<768px) — дерево разделов в Sheet */}
      <Sheet open={sectionsOpen} onOpenChange={setSectionsOpen}>
        <SheetContent side="left" className="w-72 p-3 overflow-y-auto">
          <SheetTitle className="mb-3">Разделы</SheetTitle>
          {sectionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground px-2">Загрузка...</p>
          ) : (
            <SectionTree
              sections={sections}
              selectedId={selectedSectionId}
              onSelect={(id) => {
                setSelectedSectionId(id);
                setSectionsOpen(false);
              }}
              projectId={objectId}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Правая панель — список моделей */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0"
              onClick={() => setSectionsOpen(true)}
              aria-label="Разделы"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                Версии модели {models.length}
              </h2>
              {selectedSectionName && (
                <p className="text-sm text-muted-foreground truncate">Раздел: {selectedSectionName}</p>
              )}
            </div>
          </div>
          <Button onClick={openUploadFresh} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Загрузить версию модели</span>
            <span className="sm:hidden">Загрузить</span>
          </Button>
        </div>

        <ModelVersionsTable
          models={models}
          isLoading={modelsQuery.isLoading}
          projectId={objectId}
          onUploadClick={openUploadFresh}
          onUploadNewVersion={openUploadNewVersion}
        />
      </div>

      <UploadModelDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={objectId}
        sections={sections}
        defaultSectionId={uploadDefaults.sectionId ?? selectedSectionId}
        defaultName={uploadDefaults.name}
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
