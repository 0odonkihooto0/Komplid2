'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateCard } from './TemplateCard';
import { useTemplates, CATEGORY_LABELS } from './useTemplates';

const CATEGORY_FILTERS = [
  { value: '', label: 'Все' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

export function TemplateCatalog() {
  const [activeCategory, setActiveCategory] = useState('');
  const { templates, isLoading, downloadTemplate, getPreviewHtml } = useTemplates(
    activeCategory || undefined
  );

  return (
    <div className="space-y-6">
      {/* Фильтры по категории */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={activeCategory === filter.value ? 'default' : 'outline'}
            className={cn(activeCategory === filter.value && 'shadow-none')}
            onClick={() => setActiveCategory(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Сетка карточек */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Шаблоны не найдены. Выполните <code>npx prisma db seed</code> для загрузки.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onDownload={downloadTemplate}
              onGetPreview={getPreviewHtml}
            />
          ))}
        </div>
      )}
    </div>
  );
}
