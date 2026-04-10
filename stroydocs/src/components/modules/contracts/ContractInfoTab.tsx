'use client';

import { CalendarCheck, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDetailInfo } from './useDetailInfo';
import { AddDetailInfoDialog } from './AddDetailInfoDialog';

/** Поле, выделяемое особой карточкой (срок банковской гарантии — виден на дашборде) */
const GUARANTEE_FIELD = 'Срок действия банковской гарантии';

interface Props {
  projectId: string;
  contractId: string;
  addDetailInfoOpen: boolean;
  setAddDetailInfoOpen: (v: boolean) => void;
}

export function ContractInfoTab({
  projectId,
  contractId,
  addDetailInfoOpen,
  setAddDetailInfoOpen,
}: Props) {
  const { items, isLoading, deleteMutation } = useDetailInfo(projectId, contractId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Информация о контракте
        </h3>
        <Button size="sm" onClick={() => setAddDetailInfoOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Нет информации о контракте"
          description="Добавьте произвольные поля — например, срок действия банковской гарантии"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isGuarantee = item.fieldName === GUARANTEE_FIELD;
            return (
              <Card
                key={item.id}
                className={
                  isGuarantee
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                    : undefined
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isGuarantee ? (
                        <CalendarCheck className="h-4 w-4 shrink-0 text-amber-600" />
                      ) : (
                        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        {item.fieldName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      aria-label="Удалить поле"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      isGuarantee ? 'text-amber-800 dark:text-amber-300' : ''
                    }`}
                  >
                    {item.fieldValue ?? '—'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddDetailInfoDialog
        open={addDetailInfoOpen}
        onOpenChange={setAddDetailInfoOpen}
        projectId={projectId}
        contractId={contractId}
      />
    </div>
  );
}
