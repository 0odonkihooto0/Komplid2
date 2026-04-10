'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IfcViewer } from '@/components/modules/tim/IfcViewer';
import { ModelStructurePanel } from '@/components/modules/tim/ModelStructurePanel';
import { ElementPropertiesPanel } from '@/components/modules/tim/ElementPropertiesPanel';
import { TimelineSlider } from '@/components/modules/tim/TimelineSlider';
import { CollisionDetector } from '@/components/modules/tim/CollisionDetector';
import { VersionCompare } from '@/components/modules/tim/VersionCompare';
import {
  useModelDetail,
  useGanttVersionsForViewer,
  useGanttTasksForViewer,
  useAllGprLinks,
} from '@/components/modules/tim/useModelViewer';
import type { GanttTaskViewer, BimElementLink } from '@/components/modules/tim/useModelViewer';
import { useCollisions } from '@/components/modules/tim/useCollisions';
import type { ViewerScene } from '@/components/modules/tim/ifcSceneSetup';

interface Props {
  params: { objectId: string; modelId: string };
}

// Дефолтный диапазон временной шкалы (заменяется реальными датами выбранной версии ГПР)
const DEFAULT_MIN = new Date('2025-01-01');
const DEFAULT_MAX = new Date('2025-12-31');

/** Цвет подсветки коллизионных элементов */
const COLLISION_COLOR = '#EF4444';
/** Цвет по умолчанию (нет привязки к ГПР) */
const DEFAULT_COLOR = '#9CA3AF';
/** Цвет «Следовать за работой» (бренд) */
const FOLLOW_COLOR = '#2563EB';
/** Цвет завершённых работ */
const DONE_COLOR = '#22C55E';

export default function TimModelViewerPage({ params }: Props) {
  const { objectId, modelId } = params;
  const router = useRouter();

  // ─── Состояния ───────────────────────────────────────────────────────────
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [viewerScene, setViewerScene] = useState<ViewerScene | null>(null);
  const [showCollisions, setShowCollisions] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  // Выбранная версия ГПР (синхронизируется между GprLinkPanel и Timeline)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const collisions = useCollisions();

  // ─── Данные модели и ГПР ─────────────────────────────────────────────────
  const { data: model, isLoading, error } = useModelDetail(objectId, modelId);
  const { data: ganttVersions } = useGanttVersionsForViewer(objectId);
  const { data: ganttTasksData } = useGanttTasksForViewer(objectId, selectedVersionId);
  const { data: allGprLinks } = useAllGprLinks(objectId, modelId);

  // ─── Вычисляемые диапазоны Timeline ─────────────────────────────────────
  const selectedVersion = ganttVersions?.find(v => v.id === selectedVersionId);
  const timelineMin = selectedVersion?.planStart ? new Date(selectedVersion.planStart) : DEFAULT_MIN;
  const timelineMax = selectedVersion?.planEnd ? new Date(selectedVersion.planEnd) : DEFAULT_MAX;

  // ─── Вспомогательная функция: GUID → expressID ───────────────────────────
  function buildGuidToExpressId(scene: ViewerScene): Map<string, number> {
    const map = new Map<string, number>();
    scene.guidMap.forEach((guid, expressId) => map.set(guid, expressId));
    return map;
  }

  // ─── Цветовая индикация по временной шкале ───────────────────────────────
  // Запускается при изменении даты бегунка, данных задач или привязок
  useEffect(() => {
    if (!viewerScene) return;

    // Сброс всех цветов до серого (нет привязки)
    viewerScene.materials.forEach(mat => mat.color.set(DEFAULT_COLOR));

    if (!allGprLinks || allGprLinks.length === 0) return;

    const guidToExpressId = buildGuidToExpressId(viewerScene);

    // Индекс задач выбранной версии: taskId → GanttTaskViewer
    const taskMap = new Map<string, GanttTaskViewer>();
    ganttTasksData?.tasks.forEach(t => taskMap.set(t.id, t));

    // Применяем цвета к каждому привязанному элементу
    for (const link of allGprLinks) {
      const guid = link.element?.ifcGuid;
      if (!guid) continue;

      const expressId = guidToExpressId.get(guid);
      if (expressId === undefined) continue;

      const mat = viewerScene.materials.get(expressId);
      if (!mat) continue;

      const task = taskMap.get(link.entityId);
      if (!task) continue; // задача не из выбранной версии → оставляем серым

      if (!task.factEnd) {
        // Работа не завершена → красный
        mat.color.set(COLLISION_COLOR);
      } else if (new Date(task.factEnd) <= timelineDate) {
        // Работа завершена до даты бегунка → зелёный
        mat.color.set(DONE_COLOR);
      } else {
        // Работа завершена, но позже даты бегунка → красный (ещё не выполнена на эту дату)
        mat.color.set(COLLISION_COLOR);
      }
    }
  }, [viewerScene, allGprLinks, ganttTasksData, timelineDate]);

  // ─── Подсветить пару коллизионных элементов в сцене ─────────────────────
  const handleHighlightCollision = useCallback(
    (expressIdA: number, expressIdB: number) => {
      const s = viewerScene;
      if (!s) return;
      s.materials.forEach(mat => mat.color.set(DEFAULT_COLOR));
      const matA = s.materials.get(expressIdA);
      const matB = s.materials.get(expressIdB);
      if (matA) matA.color.set(COLLISION_COLOR);
      if (matB) matB.color.set(COLLISION_COLOR);
    },
    [viewerScene]
  );

  // ─── «Следовать за работой»: подсветить все элементы привязанные к задаче
  const handleFollowWork = useCallback(
    (taskId: string) => {
      if (!viewerScene || !allGprLinks) return;

      const guidToExpressId = buildGuidToExpressId(viewerScene);

      // Сброс всех цветов
      viewerScene.materials.forEach(mat => mat.color.set(DEFAULT_COLOR));

      // Подсветить элементы данной задачи цветом бренда
      for (const link of allGprLinks) {
        if (link.entityId !== taskId) continue;
        const guid = link.element?.ifcGuid;
        if (!guid) continue;
        const expressId = guidToExpressId.get(guid);
        if (expressId === undefined) continue;
        const mat = viewerScene.materials.get(expressId);
        if (mat) mat.color.set(FOLLOW_COLOR);
      }
    },
    [viewerScene, allGprLinks]
  );

  // ─── «Выделить на модели» по документу/замечанию ───────────────────────────
  const handleFollowDoc = useCallback(
    async (entityType: string, entityId: string) => {
      if (!viewerScene) return;
      try {
        const res = await fetch(
          `/api/projects/${objectId}/bim/links?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
        );
        const json: { success: boolean; data: BimElementLink[] } = await res.json();
        if (!json.success) return;

        const guidToExpressId = buildGuidToExpressId(viewerScene);
        viewerScene.materials.forEach(mat => mat.color.set(DEFAULT_COLOR));
        for (const link of json.data) {
          const guid = link.element?.ifcGuid;
          if (!guid) continue;
          const expressId = guidToExpressId.get(guid);
          if (expressId === undefined) continue;
          const mat = viewerScene.materials.get(expressId);
          if (mat) mat.color.set(FOLLOW_COLOR);
        }
      } catch {
        // Ошибка сети — не ломаем UI
      }
    },
    [viewerScene, objectId]
  );

  const handleToggleCollisions = useCallback(() => {
    setShowCollisions(v => !v);
    setShowCompare(false);
    if (showCollisions && viewerScene) {
      viewerScene.materials.forEach(mat => mat.color.set(DEFAULT_COLOR));
      collisions.clear();
    }
  }, [showCollisions, viewerScene, collisions]);

  const handleToggleCompare = useCallback(() => {
    setShowCompare(v => !v);
    setShowCollisions(false);
  }, []);

  // ─── Ранние return (хуки ВСЕГДА выше) ────────────────────────────────────
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
        {/* Левая панель: структура модели */}
        <ModelStructurePanel
          projectId={objectId}
          modelId={modelId}
          model={model}
          viewerScene={viewerScene}
          selectedGuid={selectedGuid}
          onElementSelect={setSelectedGuid}
        />

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
            selectedVersionId={selectedVersionId}
            onVersionChange={setSelectedVersionId}
            onFollowWork={handleFollowWork}
            onFollowDoc={handleFollowDoc}
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

      {/* Временная шкала ГПР (даты от выбранной версии, иначе дефолт) */}
      <TimelineSlider
        minDate={timelineMin}
        maxDate={timelineMax}
        value={timelineDate}
        onChange={setTimelineDate}
      />
    </div>
  );
}
