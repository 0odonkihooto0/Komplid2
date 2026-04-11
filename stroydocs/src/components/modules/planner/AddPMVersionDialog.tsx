'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label }    from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  useCreatePlannerVersion,
  useUpdatePlannerVersion,
  type PlannerVersion,
} from './usePlannerVersions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  /** Если передана — режим редактирования (только name) */
  version?: PlannerVersion;
}

export function AddPMVersionDialog({ open, onOpenChange, projectId, version }: Props) {
  const isEdit = Boolean(version);

  const [name, setName]           = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  const createMutation = useCreatePlannerVersion(projectId);
  const updateMutation = useUpdatePlannerVersion(projectId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Заполнить форму при открытии диалога редактирования
  useEffect(() => {
    if (open) {
      setName(version?.name ?? '');
      setIsCurrent(false);
    }
  }, [open, version]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEdit && version) {
      // Редактирование — обновляем только name
      updateMutation.mutate(
        { versionId: version.id, name: trimmed },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      // Создание: сначала создаём, затем (если нужно) делаем актуальной
      createMutation.mutate(
        { name: trimmed },
        {
          onSuccess: (created) => {
            if (isCurrent) {
              updateMutation.mutate(
                { versionId: created.id, isCurrent: true },
                { onSuccess: () => onOpenChange(false) },
              );
            } else {
              onOpenChange(false);
            }
          },
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать версию' : 'Добавить версию УП'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="pm-version-name">Название версии</Label>
            <Input
              id="pm-version-name"
              placeholder="Например: Базовый план"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          {!isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="pm-version-current"
                checked={isCurrent}
                onCheckedChange={(checked) => setIsCurrent(checked === true)}
              />
              <Label htmlFor="pm-version-current" className="cursor-pointer">
                Актуальная версия
              </Label>
            </div>
          )}

          {!isEdit && isCurrent && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                Может быть только одна актуальная версия. Предыдущая актуальная версия потеряет свою актуальность.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
