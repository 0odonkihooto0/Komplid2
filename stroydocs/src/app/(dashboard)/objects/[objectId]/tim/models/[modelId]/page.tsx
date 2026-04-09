'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IfcViewer } from '@/components/modules/tim/IfcViewer';
import { ElementPropertiesPanel } from '@/components/modules/tim/ElementPropertiesPanel';
import { TimelineSlider } from '@/components/modules/tim/TimelineSlider';
import { CollisionDetector } from '@/components/modules/tim/CollisionDetector';
import { VersionCompare } from '@/components/modules/tim/VersionCompare';
import { useModelDetail } from '@/components/modules/tim/useModelViewer';
import { useCollisions } from '@/components/modules/tim/useCollisions';
import type { ViewerScene } from '@/components/modules/tim/ifcSceneSetup';

interface Props {
  params: { objectId: string; modelId: string };
}

// Дефолтный диапазон временной шкалы (будет заменён реальными датами из ГПР)
const DEFAULT_MIN = new Date('2025-01-01');
const DEFAULT_MAX = new Date('2025-12-31');

/** Цвет подсветки коллизионных элементов */
const COLLISION_COLOR = '#EF4444';
/** Цвет по умолчанию */
const DEFAULT_COLOR = '#9CA3AF';

export default function TimModelViewerPage({ params }: Props) {
  const { objectId, modelId } = params;
  const router = useRouter();

  const [selectedGuid, setSelectedGuid] = useState<string | null>(null);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [viewerScene, setViewerScene] = useState<ViewerScene | null>(null);
  const [showCollisions, setShowCollisions] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const collisions = useCollisions();

  const { data: model, isLoading, error } = useModelDetail(objectId, modelId);

  // Подсветить пару коллизионных элементов в сцене
  const handleHighlightCollision = useCallback(
    (expressIdA: number, expressIdB: number) => {
      const s = viewerScene;
      if (!s) return;
      // Сброс всех цветов
      s.materials.forEach((mat) => mat.color.set(DEFAULT_COLOR));
      // Подсветить два элемента
      const matA = s.materials.get(expressIdA);
      const matB = s.materials.get(expressIdB);
      if (matA) matA.color.set(COLLISION_COLOR);
      if (matB) matB.color.set(COLLISION_COLOR);
    },
    [viewerScene]
  );

  const handleToggleCollisions = useCallback(() => {
    setShowCollisions((v) => !v);
    setShowCompare(false);
    // Сброс подсветки коллизий при закрытии
    if (showCollisions && viewerScene) {
      viewerScene.materials.forEach((mat) => mat.color.set(DEFAULT_COLOR));
      collisions.clear();
    }
  }, [showCollisions, viewerScene, collisions]);

  const handleToggleCompare = useCallback(() => {
    setShowCompare((v) => !v);
    setShowCollisions(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Загрузка данных модели...</span>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Модель не найдена'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Заголовок */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{model.name}</h1>
          <p className="text-xs text-muted-foreground">
            {model.section?.name} · {model.ifcVersion ?? 'IFC'} · {model.elementCount} элементов
          </p>
        </div>
      </div>

      {/* Основная рабочая область */}
      <div className="flex min-h-0 flex-1">
        {/* 3D вьюер */}
        <div className="relative flex-1">
          <IfcViewer
            downloadUrl={model.downloadUrl}
            onElementSelected={setSelectedGuid}
            onSceneReady={setViewerScene}
            onCollisions={handleToggleCollisions}
            onCompare={handleToggleCompare}
            collisionsActive={showCollisions}
            compareActive={showCompare}
          />
        </div>

        {/* Правая панель: свойства элемента / коллизии / сравнение */}
        {selectedGuid && !showCollisions && !showCompare && (
          <ElementPropertiesPanel
            modelId={modelId}
            projectId={objectId}
            ifcGuid={selectedGuid}
            ifcProperties={viewerScene?.ifcProperties.get(selectedGuid) ?? null}
            onClose={() => setSelectedGuid(null)}
          />
        )}

        {showCollisions && (
          <div className="w-80 shrink-0 overflow-y-auto border-l p-4">
            <CollisionDetector
              scene={viewerScene}
              results={collisions.results}
              isDetecting={collisions.isDetecting}
              onDetect={collisions.detect}
              onClear={collisions.clear}
              onHighlight={handleHighlightCollision}
            />
          </div>
        )}

        {showCompare && (
          <div className="w-[480px] shrink-0 overflow-y-auto border-l p-4">
            <VersionCompare projectId={objectId} />
          </div>
        )}
      </div>

      {/* Временная шкала ГПР */}
      <TimelineSlider
        minDate={DEFAULT_MIN}
        maxDate={DEFAULT_MAX}
        value={timelineDate}
        onChange={setTimelineDate}
      />
    </div>
  );
}
