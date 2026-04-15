'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDefectTemplates, type DefectTemplateItem } from '@/hooks/useDefectTemplates';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение качества',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

const CATEGORY_COLORS: Record<string, string> = {
  QUALITY_VIOLATION:    'bg-red-100 text-red-700',
  TECHNOLOGY_VIOLATION: 'bg-orange-100 text-orange-700',
  FIRE_SAFETY:          'bg-yellow-100 text-yellow-700',
  ECOLOGY:              'bg-green-100 text-green-700',
  DOCUMENTATION:        'bg-blue-100 text-blue-700',
  OTHER:                'bg-gray-100 text-gray-700',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DefectTemplateItem) => void;
  onCreateNew: () => void;
}

export function DefectTemplatePickerDialog({ open, onOpenChange, onSelect, onCreateNew }: Props) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDefectTemplates(search, open);

  const templates = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Выбор из справочника</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-shrink-0"
        />

        <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>
          )}
          {!isLoading && templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Шаблоны не найдены</p>
          )}
          {templates.map((t) => (
            <div
              key={t.id}
              className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => onSelect(t)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug flex-1">{t.title}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge
                    className={`text-xs ${CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-700'}`}
                    variant="outline"
                  >
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </Badge>
                  {t.isSystem && (
                    <Badge variant="secondary" className="text-xs">Системный</Badge>
                  )}
                </div>
              </div>
              {t.normativeRef && (
                <p className="text-xs text-muted-foreground mt-1">{t.normativeRef}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            + Создать шаблон
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
