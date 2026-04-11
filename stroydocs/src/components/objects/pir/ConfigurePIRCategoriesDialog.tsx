'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePIRConfig } from './usePIRConfig';
import { PIR_OBJECT_TYPES } from '@/lib/pir/pir-category-presets';
import type { PIRCategoryConfigItem } from './usePIRConfig';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ConfigurePIRCategoriesDialog({ open, onOpenChange, projectId }: Props) {
  const { config, categories, createMutation, updateCategoriesMutation } = usePIRConfig(projectId);
  const [step, setStep] = useState<1 | 2>(config ? 2 : 1);
  const [selectedType, setSelectedType] = useState<string>('');
  // Локальное состояние чекбоксов: { [categoryId]: boolean }
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  // При открытии диалога — определить шаг и инициализировать чекбоксы
  useEffect(() => {
    if (open) {
      if (config) {
        setStep(2);
        const map: Record<string, boolean> = {};
        categories.forEach((c) => { map[c.id] = c.enabled; });
        setEnabledMap(map);
      } else {
        setStep(1);
        setSelectedType('');
      }
    }
  }, [open, config, categories]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Шаг 1: создать конфиг
  const handleCreateConfig = async () => {
    if (!selectedType) return;
    const created = await createMutation.mutateAsync(selectedType);
    if (created) {
      const map: Record<string, boolean> = {};
      created.categories.forEach((c: PIRCategoryConfigItem) => { map[c.id] = c.enabled; });
      setEnabledMap(map);
      setStep(2);
    }
  };

  // Шаг 2: сохранить включённость категорий
  const handleSave = async () => {
    const updates = Object.entries(enabledMap).map(([id, enabled]) => ({ id, enabled }));
    await updateCategoriesMutation.mutateAsync(updates);
    handleClose();
  };

  const toggleCategory = (id: string, checked: boolean | 'indeterminate') => {
    setEnabledMap((prev) => ({ ...prev, [id]: !!checked }));
  };

  // Отступ по уровню parentCode
  const getIndentClass = (cat: PIRCategoryConfigItem) => {
    if (!cat.parentCode) return '';
    // Проверяем есть ли у родителя родитель
    const parent = categories.find((c) => c.categoryCode === cat.parentCode);
    if (parent?.parentCode) return 'pl-8';
    return 'pl-4';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Параметры ПИР — тип объекта' : 'Настройка разделов документации'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 1 ? 'Выберите тип объекта строительства' : 'Включите нужные разделы ПД/РД'}
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            Шаг {step} из 2
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Тип объекта строительства</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип..." />
                </SelectTrigger>
                <SelectContent>
                  {PIR_OBJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-h-96 space-y-1 overflow-y-auto py-2">
            {categories.map((cat) => (
              <div key={cat.id} className={cn('flex items-center gap-2 py-1', getIndentClass(cat))}>
                <Checkbox
                  id={`cat-${cat.id}`}
                  checked={enabledMap[cat.id] ?? cat.enabled}
                  onCheckedChange={(checked) => toggleCategory(cat.id, checked)}
                />
                <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer text-sm font-normal">
                  {cat.categoryName}
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          {step === 1 && (
            <Button
              onClick={handleCreateConfig}
              disabled={!selectedType || createMutation.isPending}
            >
              Далее →
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={handleSave}
              disabled={updateCategoriesMutation.isPending}
            >
              ОК
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
