'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignDocs } from './useDesignDocs';
import { CreateDesignDocDialog } from './CreateDesignDocDialog';
import { PIRCategoryTree } from './PIRCategoryTree';
import { DOC_STATUS_CONFIG, getDocStatusDotClass } from '@/lib/pir/doc-state-machine';
import type { DesignDocItem } from './useDesignDocs';
import type { DesignDocType } from '@prisma/client';

interface Props {
  objectId: string;
  projectId: string;
  /** Если задан — скрыть сайдбар и зафиксировать фильтр по этому типу */
  fixedDocType?: DesignDocType;
  /** Показать кнопку «Создать копию» в каждой строке */
  showCopyButton?: boolean;
}

const DOC_TYPE_SHORT: Record<DesignDocType, string> = {
  DESIGN_PD:    'ПД',
  WORKING_RD:   'РД',
  SURVEY:       'Изыскания',
  REPEATED_USE: 'Повт. прим.',
};

function StatusDot({ doc }: { doc: DesignDocItem }) {
  const hasActive = doc._count.comments > 0 && doc.status === 'WITH_COMMENTS';
  const dotClass = getDocStatusDotClass(doc.status, hasActive, false);
  return <span className={cn('inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full', dotClass)} />;
}

function DocRowSkeleton({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export function DesignDocList({ objectId, projectId, fixedDocType, showCopyButton }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { docs, isLoading, copyMutation } = useDesignDocs(projectId, fixedDocType ?? null, activeCategory);
  const colCount = showCopyButton ? 9 : 8;

  return (
    <div className="flex gap-0 rounded-md border">
      {/* Левая панель — дерево категорий ПИР (скрыта при fixedDocType) */}
      {!fixedDocType && (
        <PIRCategoryTree
          projectId={projectId}
          activeCode={activeCategory}
          onSelect={setActiveCategory}
        />
      )}

      {/* Правая часть — заголовок + таблица */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            {activeCategory ?? 'Все документы'}
          </h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Создать документ
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-6 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Шифр</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Наименование</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Тип</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Версия</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Статус</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Ответственный</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Замеч.</th>
                {showCopyButton && (
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Действия</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => <DocRowSkeleton key={i} colCount={colCount} />)}

              {!isLoading && docs.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Нет документов ПИР. Создайте первый.
                  </td>
                </tr>
              )}

              {!isLoading &&
                docs.map((doc) => {
                  const config = DOC_STATUS_CONFIG[doc.status];
                  return (
                    <tr
                      key={doc.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
                      onClick={() =>
                        router.push(`/objects/${objectId}/pir/documentation/${doc.id}`)
                      }
                    >
                      <td className="px-3 py-3">
                        <StatusDot doc={doc} />
                      </td>
                      <td className="px-3 py-3 font-medium text-muted-foreground">
                        {doc.category ?? doc.number}
                      </td>
                      <td className="px-3 py-3 font-medium">{doc.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {DOC_TYPE_SHORT[doc.docType]}
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        v{doc.version}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                            config?.badgeClass ?? 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {config?.label ?? doc.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {doc.responsibleUser
                          ? `${doc.responsibleUser.lastName} ${doc.responsibleUser.firstName}`
                          : doc.responsibleOrg?.name ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {doc._count.comments > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {doc._count.comments}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {showCopyButton && (
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={copyMutation.isPending}
                            onClick={() => copyMutation.mutate(doc.id)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Создать копию
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateDesignDocDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
