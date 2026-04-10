'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoordinates } from './useCoordinates';
import { AddCoordinateDialog } from './AddCoordinateDialog';
import type { ProjectCoordinate, CoordinatePayload } from './useCoordinates';

// Leaflet требует только браузерную среду — отключаем SSR
const CoordinatesMapInner = dynamic(
  () => import('./CoordinatesMapInner').then((m) => m.CoordinatesMapInner),
  { ssr: false, loading: () => <Skeleton className="h-[400px] w-full rounded-lg" /> }
);

interface Props {
  projectId: string;
  address: string | null;
}

export function CoordinatesMap({ projectId, address }: Props) {
  const { coordinates, isLoading, addMutation, updateMutation, deleteMutation } =
    useCoordinates(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProjectCoordinate | null>(null);

  function openAdd() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(item: ProjectCoordinate) {
    setEditItem(item);
    setDialogOpen(true);
  }

  function handleSubmit(payload: CoordinatePayload) {
    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      addMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Карта и координаты</CardTitle>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить точку
        </Button>
      </CardHeader>
      <CardContent className="p-0 px-6 pb-6">
        {isLoading ? (
          <Skeleton className="h-[400px] w-full rounded-lg" />
        ) : (
          <CoordinatesMapInner
            coordinates={coordinates}
            address={address}
            onEdit={openEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </CardContent>

      <AddCoordinateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editItem={editItem}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
