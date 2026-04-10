'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelStatusBadge } from './ModelStatusBadge';
import { ModelStructureTree } from './ModelStructureTree';
import { ModelFilesTab } from './ModelFilesTab';
import { useModels } from './useModels';
import type { ViewerScene } from './ifcSceneSetup';
import type { BimModelDetail } from './useModelViewer';

interface Props {
  projectId: string;
  modelId: string;
  model: BimModelDetail;
  viewerScene: ViewerScene | null;
  selectedGuid: string | null;
  onElementSelect: (guid: string) => void;
}

const STORAGE_KEY = 'tim-structure-panel-collapsed';

export function ModelStructurePanel({
  projectId, modelId, model, viewerScene, selectedGuid, onElementSelect,
}: Props) {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const { data: allModels } = useModels(projectId);
  const relatedModels = allModels?.filter((m) => m.id !== modelId) ?? [];

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="flex w-9 shrink-0 flex-col items-center border-r bg-background pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleCollapse}
          aria-label="Развернуть панель структуры"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-r bg-background">
      {/* Заголовок панели */}
      <div className="flex shrink-0 items-center justify-between border-b px-2 py-1.5">
        <span className="text-xs font-semibold">Структура модели</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleCollapse}
          aria-label="Свернуть панель"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="structure" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-2 mt-1.5 grid shrink-0 grid-cols-3">
          <TabsTrigger value="structure" className="text-[10px]">Структура</TabsTrigger>
          <TabsTrigger value="files" className="text-[10px]">Файлы</TabsTrigger>
          <TabsTrigger value="related" className="text-[10px]">Связанные</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <ModelStructureTree
              projectId={projectId}
              modelId={modelId}
              viewerScene={viewerScene}
              selectedGuid={selectedGuid}
              onElementSelect={onElementSelect}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <ModelFilesTab model={model} projectId={projectId} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="related" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 px-2 py-2">
              {relatedModels.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Нет других моделей ТИМ для этого объекта
                </p>
              ) : (
                relatedModels.map((m) => (
                  <div
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/50"
                    onClick={() => router.push(`/objects/${projectId}/tim/models/${m.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-muted-foreground">{m.section?.name ?? '—'}</p>
                    </div>
                    <ModelStatusBadge status={m.status} />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
