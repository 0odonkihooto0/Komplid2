'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGanttTasksGPR } from './useGanttScheduleHooks';
import type { CreateDailyPlanInput } from './useGanttDailyPlans';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  versionId: string;
  planDate: string;
  onSubmit: (input: CreateDailyPlanInput) => void;
  isPending: boolean;
}

export function GanttAddDailyPlanDialog({
  open,
  onOpenChange,
  objectId,
  versionId,
  planDate,
  onSubmit,
  isPending,
}: Props) {
  const [taskId, setTaskId] = useState('');
  const [workers, setWorkers] = useState('');
  const [machinery, setMachinery] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useGanttTasksGPR(objectId, versionId);
  // Показываем только листовые задачи (не группы) — level > 0 или нет дочерних
  const tasks = data.tasks;

  function handleSubmit() {
    if (!taskId) return;
    onSubmit({
      taskId,
      planDate: new Date(planDate).toISOString(),
      workers: workers ? parseInt(workers, 10) : undefined,
      machinery: machinery || undefined,
      volume: volume ? parseFloat(volume) : undefined,
      unit: unit || undefined,
      notes: notes || undefined,
    });
  }

  function handleClose(open: boolean) {
    if (!open) {
      setTaskId('');
      setWorkers('');
      setMachinery('');
      setVolume('');
      setUnit('');
      setNotes('');
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить запись на {planDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Выбор задачи */}
          <div className="space-y-1">
            <Label className="text-sm">Задача *</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите задачу из ГПР" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Ресурсы */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Рабочие (чел.)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={workers}
                onChange={(e) => setWorkers(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Объём</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="ед."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-16"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Техника</Label>
            <Input
              placeholder="Экскаватор, Кран…"
              value={machinery}
              onChange={(e) => setMachinery(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Примечание</Label>
            <Textarea
              placeholder="Дополнительная информация…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!taskId || isPending}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
