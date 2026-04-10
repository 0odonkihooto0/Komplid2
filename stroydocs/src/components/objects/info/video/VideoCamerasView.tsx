'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCameras, type VideoCamera } from './useCameras';
import { CamerasTable } from './CamerasTable';
import { AddCameraDialog } from './AddCameraDialog';

interface VideoCamerasViewProps {
  objectId: string;
}

export function VideoCamerasView({ objectId }: VideoCamerasViewProps) {
  const { cameras, isLoading, createMutation, updateMutation, deleteMutation } =
    useCameras(objectId);

  const [addOpen, setAddOpen] = useState(false);
  const [editCamera, setEditCamera] = useState<VideoCamera | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок + кнопка */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Видеонаблюдение</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Таблица камер */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Камеры видеонаблюдения</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <CamerasTable
            cameras={cameras}
            onEdit={setEditCamera}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Диалог добавления */}
      <AddCameraDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        objectId={objectId}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, { onSuccess: () => setAddOpen(false) });
        }}
      />

      {/* Диалог редактирования */}
      <AddCameraDialog
        open={editCamera !== null}
        onOpenChange={(open) => { if (!open) setEditCamera(null); }}
        editCamera={editCamera}
        objectId={objectId}
        isPending={updateMutation.isPending}
        onSubmit={(data) => {
          if (!editCamera) return;
          updateMutation.mutate(
            { id: editCamera.id, data },
            { onSuccess: () => setEditCamera(null) }
          );
        }}
      />
    </div>
  );
}
