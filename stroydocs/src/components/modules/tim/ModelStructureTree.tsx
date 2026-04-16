'use client';

import { useState, useMemo, useCallback } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useModelStructure, type StructureLevel } from './useModelStructure';
import type { ViewerScene } from './ifcSceneSetup';

interface Props {
  projectId: string;
  modelId: string;
  viewerScene: ViewerScene | null;
  selectedGuid: string | null;
  onElementSelect: (guid: string) => void;
}

/** Переключить видимость меша по GUID в Three.js сцене */
function setMeshVisibility(guid: string, visible: boolean, vs: ViewerScene) {
  // meshMap: Map<Object3D, string> — ищем по значению (guid)
  vs.meshMap.forEach((g, mesh) => {
    if (g === guid) (mesh as { visible: boolean }).visible = visible;
  });
}

export function ModelStructureTree({ projectId, modelId, viewerScene, selectedGuid, onElementSelect }: Props) {
  const { data: levels, isLoading, error } = useModelStructure(projectId, modelId);
  const [search, setSearch] = useState('');
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [visibilityMap, setVisibilityMap] = useState<Map<string, boolean>>(new Map());

  const filtered = useMemo(() => {
    if (!levels) return [];
    if (!search.trim()) return levels;
    const q = search.toLowerCase();
    return levels
      .map((level) => ({
        ...level,
        elements: level.elements.filter(
          (el) =>
            el.name?.toLowerCase().includes(q) ||
            el.ifcType.toLowerCase().includes(q) ||
            el.guid.toLowerCase().includes(q)
        ),
      }))
      .filter((level) => level.elements.length > 0);
  }, [levels, search]);

  const toggleLevel = (label: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  /** Проверка видимости элемента (по умолчанию — видим) */
  const isVisible = useCallback(
    (guid: string) => visibilityMap.get(guid) !== false,
    [visibilityMap]
  );

  /** Переключить видимость одного элемента */
  const toggleVisibility = (guid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisible = !isVisible(guid);
    setVisibilityMap((prev) => {
      const next = new Map(prev);
      next.set(guid, newVisible);
      return next;
    });
    if (viewerScene) setMeshVisibility(guid, newVisible, viewerScene);
  };

  /** Переключить видимость всех элементов уровня (группы) */
  const toggleLevelVisibility = (level: StructureLevel, e: React.MouseEvent) => {
    e.stopPropagation();
    const allVisible = level.elements.every((el) => isVisible(el.guid));
    const newVisible = !allVisible;
    setVisibilityMap((prev) => {
      const next = new Map(prev);
      for (const el of level.elements) next.set(el.guid, newVisible);
      return next;
    });
    if (viewerScene) {
      for (const el of level.elements) setMeshVisibility(el.guid, newVisible, viewerScene);
    }
  };

  /** Показать все элементы */
  const showAll = () => {
    setVisibilityMap((prev) => {
      const next = new Map(prev);
      for (const k of Array.from(next.keys())) next.set(k, true);
      return next;
    });
    if (viewerScene) {
      viewerScene.meshMap.forEach((_guid, mesh) => {
        (mesh as unknown as { visible: boolean }).visible = true;
      });
    }
  };

  /** Скрыть все элементы */
  const hideAll = () => {
    if (!levels) return;
    setVisibilityMap(() => {
      const next = new Map<string, boolean>();
      for (const level of levels) {
        for (const el of level.elements) next.set(el.guid, false);
      }
      return next;
    });
    if (viewerScene) {
      viewerScene.meshMap.forEach((_guid, mesh) => {
        (mesh as unknown as { visible: boolean }).visible = false;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Загрузка элементов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-xs text-muted-foreground">Элементы не загружены. Возможно, модель ещё парсится.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Кнопки «Показать все» / «Скрыть все» */}
      <div className="flex items-center gap-1 px-2 pt-2">
        <button
          onClick={showAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Показать все
        </button>
        <span className="text-xs text-muted-foreground">/</span>
        <button
          onClick={hideAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Скрыть все
        </button>
      </div>

      <div className="px-2 pb-1">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по элементам..."
          className="h-7 text-xs"
        />
      </div>

      {filtered.length === 0 && (
        <p className="px-3 py-4 text-xs text-muted-foreground">Элементы не найдены</p>
      )}

      {filtered.map((level) => {
        const isOpen = expandedLevels.has(level.label);
        const levelAllVisible = level.elements.every((el) => isVisible(el.guid));
        return (
          <div key={level.label}>
            {/* Строка уровня: expand/collapse + Eye + счётчик */}
            <div className="group flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50">
              <button
                className="flex flex-1 items-center gap-1"
                onClick={() => toggleLevel(level.label)}
              >
                {isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className={cn('truncate', !levelAllVisible && 'opacity-60')}>
                  {level.label}
                </span>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 transition-opacity"
                onClick={(e) => toggleLevelVisibility(level, e)}
                aria-label={levelAllVisible ? 'Скрыть уровень' : 'Показать уровень'}
              >
                {levelAllVisible
                  ? <Eye size={13} className="text-gray-400" />
                  : <EyeOff size={13} className="text-gray-300" />}
              </button>
              <span className="shrink-0 text-[10px]">{level.elements.length}</span>
            </div>

            {isOpen && level.elements.map((el) => {
              const isSelected = el.guid === selectedGuid;
              return (
                <div
                  key={el.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-1.5 pl-5 pr-2 py-0.5 text-xs hover:bg-muted/40',
                    isSelected && 'bg-blue-600/15 text-blue-600'
                  )}
                  onClick={() => onElementSelect(el.guid)}
                >
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 transition-opacity"
                    onClick={(e) => toggleVisibility(el.guid, e)}
                    aria-label={isVisible(el.guid) ? 'Скрыть элемент' : 'Показать элемент'}
                  >
                    {isVisible(el.guid)
                      ? <Eye size={13} className="text-gray-400" />
                      : <EyeOff size={13} className="text-gray-300" />}
                  </button>
                  <span className={cn('truncate', !isVisible(el.guid) && 'opacity-40')}>
                    {el.name ?? el.ifcType}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
