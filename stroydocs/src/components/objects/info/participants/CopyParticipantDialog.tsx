'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface BuildingObjectOption {
  id: string;
  name: string;
  address: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participantType: 'org' | 'person';
  currentProjectId: string;
  onSubmit: (id: string, targetObjectId: string, type: 'org' | 'person') => Promise<void>;
  isPending: boolean;
}

export function CopyParticipantDialog({
  open,
  onOpenChange,
  participantId,
  participantType,
  currentProjectId,
  onSubmit,
  isPending,
}: Props) {
  const [targetId, setTargetId] = useState('');

  // Загружаем список активных объектов (исключая текущий)
  const { data: projects = [], isLoading: projectsLoading } = useQuery<BuildingObjectOption[]>({
    queryKey: ['projects-list-for-copy'],
    queryFn: async () => {
      const res = await fetch('/api/projects?status=ACTIVE&limit=100');
      const json = await res.json();
      if (!json.success) return [];
      return (json.data as BuildingObjectOption[]).filter((p) => p.id !== currentProjectId);
    },
    enabled: open,
  });

  const handleClose = () => {
    onOpenChange(false);
    setTargetId('');
  };

  const handleSubmit = async () => {
    if (!targetId) return;
    await onSubmit(participantId, targetId, participantType);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Скопировать в другой объект</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите объект для копирования участника
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Целевой объект</Label>
            {projectsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
              </div>
            ) : (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите объект" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.address && <span className="text-xs text-muted-foreground"> — {p.address}</span>}
                    </SelectItem>
                  ))}
                  {projects.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Нет других объектов</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!targetId || isPending}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Копирование...</> : 'Скопировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
