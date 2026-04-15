'use client';

import { useState, useMemo } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useModelStructure } from './useModelStructure';
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
  const [hiddenGuids, setHiddenGuids] = useState<Set<string>>(new Set());

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

  const toggleVisibility = (guid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nowHidden = !hiddenGuids.has(guid);
    setHiddenGuids((prev) => {
      const next = new Set(prev);
      if (nowHidden) next.add(guid);
      else next.delete(guid);
      return next;
    });
    if (viewerScene) setMeshVisibility(guid, !nowHidden, viewerScene);
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
      <div className="px-2 pb-1 pt-2">
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
        return (
          <div key={level.label}>
            <button
              className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
              onClick={() => toggleLevel(level.label)}
            >
              {isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <span className="truncate">{level.label}</span>
              <span className="ml-auto shrink-0 text-[10px]">{level.elements.length}</span>
            </button>

            {isOpen && level.elements.map((el) => {
              const isSelected = el.guid === selectedGuid;
              const isHidden = hiddenGuids.has(el.guid);
              return (
                <div
                  key={el.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-1.5 pl-5 pr-2 py-0.5 text-xs hover:bg-muted/40',
                    isSelected && 'bg-blue-600/15 text-blue-600'
                  )}
                  onClick={() => onElementSelect(el.guid)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => toggleVisibility(el.guid, e)}
                    aria-label={isHidden ? 'Показать элемент' : 'Скрыть элемент'}
                  >
                    {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <span className={cn('truncate', isHidden && 'opacity-40')}>
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
