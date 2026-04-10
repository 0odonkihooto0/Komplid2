'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/utils/format';
import { useFinancialTables } from './useFinancialTables';
import { CreateFinancialTableDialog } from './CreateFinancialTableDialog';
import { FinancialTableEditor } from './FinancialTableEditor';

interface Props {
  projectId: string;
  contractId: string;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
}

export function FinancialTablesTab({
  projectId,
  contractId,
  createOpen,
  setCreateOpen,
}: Props) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const { tables, isLoading, deleteMutation } = useFinancialTables(projectId, contractId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Финансовые таблицы</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          title="Нет финансовых таблиц"
          description="Создайте произвольную финансовую таблицу или заполните из ГПР"
        />
      ) : (
        <div className="divide-y rounded-md border">
          {tables.map((t) => (
            <div key={t.id}>
              {/* Кликабельная строка-заголовок таблицы */}
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTableId(selectedTableId === t.id ? null : t.id)}
              >
                <div className="flex items-center gap-2">
                  {selectedTableId === t.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{t.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
              </button>

              {/* Встроенный редактор — раскрывается по клику на строку */}
              {selectedTableId === t.id && (
                <div className="border-t bg-muted/20 p-4">
                  <FinancialTableEditor
                    projectId={projectId}
                    contractId={contractId}
                    tableId={t.id}
                    onDelete={() => {
                      setSelectedTableId(null);
                      deleteMutation.mutate(t.id);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateFinancialTableDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        contractId={contractId}
        onCreated={(newId) => setSelectedTableId(newId)}
      />
    </div>
  );
}
