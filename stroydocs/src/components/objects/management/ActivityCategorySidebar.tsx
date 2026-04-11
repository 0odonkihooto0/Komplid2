'use client';

import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityCategories, useCreateActivityCategory } from './useActivities';

interface ActivityCategorySidebarProps {
  objectId:           string;
  selectedCategoryId: string;
  onSelect:           (id: string) => void;
  onConfigureClick:   () => void;
}

export function ActivityCategorySidebar({
  objectId,
  selectedCategoryId,
  onSelect,
  onConfigureClick,
}: ActivityCategorySidebarProps) {
  const { data: categories = [], isLoading } = useActivityCategories(objectId);
  const createMutation = useCreateActivityCategory(objectId);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(
      { name, order: categories.length },
      {
        onSuccess: () => {
          setNewName('');
          setCreating(false);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col py-4">
      <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Категории
      </p>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {/* Пункт «Все категории» */}
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
            selectedCategoryId === 'all'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Все категории
        </button>

        {/* Список категорий */}
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mx-1 h-8 w-full" />
            ))
          : categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {cat.name}
              </button>
            ))}

        {/* Inline-форма создания категории */}
        {creating && (
          <div className="mt-1 space-y-1 px-1">
            <Input
              autoFocus
              placeholder="Название категории"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
              className="h-8 text-sm"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim()}
              >
                Создать
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setCreating(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Кнопки действий внизу */}
      <div className="mt-2 space-y-1 border-t px-2 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Создать категорию
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onConfigureClick}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Настроить категории
        </Button>
      </div>
    </div>
  );
}
