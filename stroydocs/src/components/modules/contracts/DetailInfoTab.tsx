'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trash2, Plus, Info } from 'lucide-react';
import { useDetailInfo } from './useDetailInfo';
import { AddDetailInfoDialog } from './AddDetailInfoDialog';

interface Props {
  projectId: string;
  contractId: string;
  addDetailInfoOpen: boolean;
  setAddDetailInfoOpen: (v: boolean) => void;
}

export function DetailInfoTab({
  projectId,
  contractId,
  addDetailInfoOpen,
  setAddDetailInfoOpen,
}: Props) {
  const { items, isLoading, deleteMutation } = useDetailInfo(projectId, contractId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Дополнительные сведения</h3>
        <Button size="sm" onClick={() => setAddDetailInfoOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Список пар ключ-значение */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Info className="h-12 w-12" />}
          title="Нет дополнительных сведений"
          description="Добавьте произвольные поля к договору"
        />
      ) : (
        <div className="divide-y rounded-md border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2">
              <span className="font-medium text-sm">{item.fieldName}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {item.fieldValue ?? '—'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Удалить запись"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
