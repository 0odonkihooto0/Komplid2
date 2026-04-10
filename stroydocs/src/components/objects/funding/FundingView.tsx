'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFundingRecords, type FundingRecord } from './useFundingRecords';
import { FundingRecordsTable } from './FundingRecordsTable';
import { FundingWidget } from './FundingWidget';
import { AddFundingDialog } from './AddFundingDialog';
import { EditFundingDialog } from './EditFundingDialog';

interface FundingViewProps {
  projectId: string;
}

export function FundingView({ projectId }: FundingViewProps) {
  const { records, isLoading, createMutation, updateMutation, deleteMutation } =
    useFundingRecords(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FundingRecord | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок + кнопка */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Финансирование</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Таблица записей */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Записи финансирования</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <FundingRecordsTable
            records={records}
            onEdit={setEditRecord}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Виджет «Финансирование» */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Структура финансирования</CardTitle>
        </CardHeader>
        <CardContent>
          <FundingWidget records={records} />
        </CardContent>
      </Card>

      {/* Диалог добавления */}
      <AddFundingDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, { onSuccess: () => setAddOpen(false) });
        }}
      />

      {/* Диалог редактирования */}
      <EditFundingDialog
        record={editRecord}
        open={editRecord !== null}
        onOpenChange={(open) => { if (!open) setEditRecord(null); }}
        isPending={updateMutation.isPending}
        onSubmit={(id, data) => {
          updateMutation.mutate(
            { id, data },
            { onSuccess: () => setEditRecord(null) }
          );
        }}
      />
    </div>
  );
}
