'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ARCHIVE_CATEGORY_LABELS } from '@/utils/constants';
import { useArchive } from './useArchive';
import type { ArchiveCategory } from '@prisma/client';

const CATEGORIES: ArchiveCategory[] = [
  'PERMITS',
  'WORKING_PROJECT',
  'EXECUTION_DRAWINGS',
  'CERTIFICATES',
  'LABORATORY',
  'STANDARDS',
];

interface Props {
  contractId: string;
}

export function ArchiveTable({ contractId }: Props) {
  const { documents, columns, isLoading } = useArchive(contractId);
  const [activeCategory, setActiveCategory] = useState<ArchiveCategory>('PERMITS');

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const filtered = documents.filter((doc) => doc.category === activeCategory);

  return (
    <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ArchiveCategory)}>
      <TabsList className="flex-wrap h-auto gap-1">
        {CATEGORIES.map((cat) => {
          const count = documents.filter((d) => d.category === cat).length;
          return (
            <TabsTrigger key={cat} value={cat} className="flex items-center gap-1.5 text-xs">
              {ARCHIVE_CATEGORY_LABELS[cat]}
              {count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {CATEGORIES.map((cat) => (
        <TabsContent key={cat} value={cat} className="mt-4">
          <DataTable
            columns={columns}
            data={cat === activeCategory ? filtered : []}
            searchPlaceholder="Поиск по документам..."
            searchColumn="fileName"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
