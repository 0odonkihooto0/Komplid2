'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { GanttTaskItem, GanttDependencyItem } from './ganttTypes';
import { useCreateDependency, useDeleteDependency } from './useGanttDependencies';

const DEP_TYPE_LABELS: Record<string, string> = {
  FS: 'FS — Окончание → Начало',
  SS: 'SS — Начало → Начало',
  FF: 'FF — Окончание → Окончание',
  SF: 'SF — Начало → Окончание',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  versionId: string;
  tasks: GanttTaskItem[];
  dependencies: GanttDependencyItem[];
  selectedTaskId?: string;
}

export function GanttDependencyDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  versionId,
  tasks,
  dependencies,
  selectedTaskId,
}: Props) {
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState(selectedTaskId ?? '');
  const [type, setType] = useState<'FS' | 'SS' | 'FF' | 'SF'>('FS');
  const [lagDays, setLagDays] = useState(0);

  const createDep = useCreateDependency(projectId, contractId, versionId);
  const deleteDep = useDeleteDependency(projectId, contractId, versionId);

  function handleAdd() {
    if (!predecessorId || !successorId) return;
    createDep.mutate({ predecessorId, successorId, type, lagDays }, {
      onSuccess: () => {
        setPredecessorId('');
        setLagDays(0);
      },
    });
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Зависимости между задачами</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Добавление */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Добавить зависимость</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Предшественник</Label>
                <Select value={predecessorId} onValueChange={setPredecessorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите задачу" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.filter((t) => t.id !== successorId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Преемник</Label>
                <Select value={successorId} onValueChange={setSuccessorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите задачу" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.filter((t) => t.id !== predecessorId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Тип</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEP_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Задержка (дней)</Label>
                <Input
                  type="number"
                  value={lagDays}
                  onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!predecessorId || !successorId || createDep.isPending}
            >
              Добавить
            </Button>
          </div>

          {/* Список */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Существующие зависимости</p>
            {dependencies.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет зависимостей</p>
            )}
            {dependencies.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <span>
                  <span className="font-medium">{taskMap.get(d.predecessorId)?.name ?? d.predecessorId}</span>
                  {' '}<span className="text-muted-foreground">{d.type}</span>{' '}
                  <span className="font-medium">{taskMap.get(d.successorId)?.name ?? d.successorId}</span>
                  {d.lagDays !== 0 && (
                    <span className="ml-1 text-muted-foreground">({d.lagDays > 0 ? '+' : ''}{d.lagDays} д.)</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  aria-label="Удалить зависимость"
                  onClick={() => deleteDep.mutate(d.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
