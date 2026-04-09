'use client';

import { useState } from 'react';
import { Plus, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ParticipantCard } from './ParticipantCard';
import { AddObjectParticipantDialog } from './AddObjectParticipantDialog';
import { useParticipantsView } from './useParticipantsView';

interface Props {
  objectId: string;
}

export function ParticipantsView({ objectId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { participants, isLoading, error } = useParticipantsView(objectId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить участников</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Участники строительства</h2>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {participants.length > 0
                ? `${participants.length} организ${participants.length === 1 ? 'ация' : participants.length < 5 ? 'ации' : 'аций'}`
                : 'Нет участников'}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить участника
        </Button>
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && participants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Участники не добавлены</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Добавьте организации через договоры объекта или нажмите «Добавить участника».
          </p>
        </div>
      )}

      {/* Сетка карточек */}
      {!isLoading && participants.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {participants.map((item) => (
            <ParticipantCard key={item.organization.id} item={item} />
          ))}
        </div>
      )}

      <AddObjectParticipantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        objectId={objectId}
      />
    </div>
  );
}
