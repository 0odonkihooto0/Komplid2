'use client';

import { useState } from 'react';
import { Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePIRConfig } from './usePIRConfig';
import { ConfigurePIRCategoriesDialog } from './ConfigurePIRCategoriesDialog';
import type { PIRCategoryConfigItem } from './usePIRConfig';

interface Props {
  projectId: string;
  activeCode: string | null;
  onSelect: (code: string | null) => void;
}

export function PIRCategoryTree({ projectId, activeCode, onSelect }: Props) {
  const { config, categories, isLoading } = usePIRConfig(projectId);
  const [configureOpen, setConfigureOpen] = useState(false);

  // Строим дерево: корневые узлы и их дети
  const roots = categories.filter((c) => !c.parentCode && c.enabled);
  const getChildren = (code: string): PIRCategoryConfigItem[] =>
    categories.filter((c) => c.parentCode === code && c.enabled);

  return (
    <>
      <aside className="w-56 flex-shrink-0 border-r">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Разделы
          </p>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Настроить разделы"
              onClick={() => setConfigureOpen(true)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Добавить пользовательский раздел"
              onClick={() => setConfigureOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="p-2">
          {/* Все документы */}
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              activeCode === null
                ? 'bg-primary text-primary-foreground font-medium'
                : 'hover:bg-muted'
            )}
          >
            Все документы
          </button>

          {isLoading && (
            <div className="mt-2 space-y-1.5 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}

          {!isLoading && !config && (
            <p className="mt-3 px-2 text-xs text-muted-foreground">
              Нажмите ⚙ для настройки разделов
            </p>
          )}

          {!isLoading && config && roots.length === 0 && (
            <p className="mt-3 px-2 text-xs text-muted-foreground">
              Все разделы скрыты. Нажмите ⚙ для настройки.
            </p>
          )}

          {!isLoading && config && (
            <ul className="mt-1 space-y-0.5">
              {roots.map((root) => {
                const children = getChildren(root.categoryCode);
                return (
                  <li key={root.categoryCode}>
                    {/* Корневой узел — не кликабелен для фильтра, только заголовок */}
                    <span className="block px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {root.categoryName}
                    </span>
                    {/* Дочерние узлы */}
                    {children.length > 0 && (
                      <ul className="space-y-0.5">
                        {children.map((child) => {
                          const grandchildren = getChildren(child.categoryCode);
                          return (
                            <li key={child.categoryCode}>
                              <button
                                onClick={() => onSelect(child.categoryCode)}
                                className={cn(
                                  'w-full rounded-md px-2 py-1 pl-4 text-left text-sm transition-colors',
                                  activeCode === child.categoryCode
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'hover:bg-muted'
                                )}
                              >
                                {child.categoryName}
                              </button>
                              {grandchildren.map((gc) => (
                                <button
                                  key={gc.categoryCode}
                                  onClick={() => onSelect(gc.categoryCode)}
                                  className={cn(
                                    'w-full rounded-md px-2 py-1 pl-8 text-left text-sm transition-colors',
                                    activeCode === gc.categoryCode
                                      ? 'bg-primary text-primary-foreground font-medium'
                                      : 'hover:bg-muted'
                                  )}
                                >
                                  {gc.categoryName}
                                </button>
                              ))}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {/* Если у корня нет детей — он сам кликабелен */}
                    {children.length === 0 && (
                      <button
                        onClick={() => onSelect(root.categoryCode)}
                        className={cn(
                          'w-full rounded-md px-2 py-1 text-left text-sm transition-colors',
                          activeCode === root.categoryCode
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-muted'
                        )}
                      >
                        {root.categoryName}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <ConfigurePIRCategoriesDialog
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        projectId={projectId}
      />
    </>
  );
}
