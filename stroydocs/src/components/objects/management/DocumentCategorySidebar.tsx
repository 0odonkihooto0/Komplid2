'use client';

import { cn } from '@/lib/utils';
import type { DocumentCategory } from './useDocumentsRegistry';

interface Category {
  value: DocumentCategory;
  label: string;
}

const CATEGORIES: Category[] = [
  { value: 'all',   label: 'Все документы' },
  { value: 'id',    label: 'Исполнительная документация' },
  { value: 'ks',    label: 'КС-2 / КС-3' },
  { value: 'sk',    label: 'Акты СК' },
  { value: 'pir',   label: 'ПИР' },
  { value: 'other', label: 'Прочие' },
];

interface DocumentCategorySidebarProps {
  selectedCategory: DocumentCategory;
  onSelect: (category: DocumentCategory) => void;
}

export function DocumentCategorySidebar({
  selectedCategory,
  onSelect,
}: DocumentCategorySidebarProps) {
  return (
    <div className="flex flex-col py-4">
      <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Категории
      </p>
      <nav className="space-y-0.5 px-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
              selectedCategory === cat.value
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
