'use client';

import { useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLimitRisks, type LimitRisk } from './useLimitRisks';
import { LimitRisksTable } from './LimitRisksTable';
import { AddLimitRiskDialog } from './AddLimitRiskDialog';

interface LimitRisksViewProps {
  projectId: string;
}

export function LimitRisksView({ projectId }: LimitRisksViewProps) {
  const { risks, isLoading, createMutation, updateMutation, deleteMutation } =
    useLimitRisks(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LimitRisk | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок + кнопки */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Риски неосвоения лимитов</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Печать">
            <Printer className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Таблица рисков */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Записи о рисках</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <LimitRisksTable
            risks={risks}
            onEdit={setEditRecord}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Диалог добавления */}
      <AddLimitRiskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, { onSuccess: () => setAddOpen(false) });
        }}
      />

      {/* Диалог редактирования */}
      <AddLimitRiskDialog
        open={editRecord !== null}
        onOpenChange={(open) => { if (!open) setEditRecord(null); }}
        projectId={projectId}
        editRecord={editRecord}
        isPending={updateMutation.isPending}
        onSubmit={(data) => {
          if (!editRecord) return;
          updateMutation.mutate(
            { id: editRecord.id, data },
            { onSuccess: () => setEditRecord(null) }
          );
        }}
      />
    </div>
  );
}
