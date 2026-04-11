'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityCategories, useConfigureCategories } from './useActivities';

interface ConfigureCategoriesDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  objectId:     string;
}

export function ConfigureCategoriesDialog({
  open,
  onOpenChange,
  objectId,
}: ConfigureCategoriesDialogProps) {
  // Загружаем ВСЕ системные категории, включая скрытые
  const { data: categories = [], isLoading } = useActivityCategories(objectId, true);
  const configureMutation = useConfigureCategories(objectId);

  // Набор ID категорий, помеченных как видимые
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Синхронизируем состояние чекбоксов при открытии диалога
  useEffect(() => {
    if (open && categories.length > 0) {
      setSelectedIds(new Set(categories.filter((c) => !c.isHidden).map((c) => c.id)));
    }
  }, [open, categories]);

  const systemCategories = categories.filter((c) => c.isSystem);
  const allChecked = systemCategories.length > 0 && systemCategories.every((c) => selectedIds.has(c.id));

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(systemCategories.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleOk() {
    configureMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Настроить категории документов</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите системные категории мероприятий, которые будут отображаться в боковой панели
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))
          ) : (
            <>
              {/* Мастер-чекбокс */}
              <div className="flex items-center gap-2 border-b pb-2">
                <Checkbox
                  id="all-categories"
                  checked={allChecked}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
                <Label htmlFor="all-categories" className="cursor-pointer font-medium">
                  Все категории
                </Label>
              </div>

              {/* Список системных категорий */}
              {systemCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cat.id}
                    checked={selectedIds.has(cat.id)}
                    onCheckedChange={(v) => toggleOne(cat.id, !!v)}
                  />
                  <Label htmlFor={cat.id} className="cursor-pointer text-sm">
                    {cat.name}
                  </Label>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleOk} disabled={configureMutation.isPending}>
            {configureMutation.isPending ? 'Сохранение...' : 'ОК'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
