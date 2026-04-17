'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateTaskFull, type CreateTaskInput } from './useCreateTaskFull';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetParentTaskId?: string;
  presetGroupId?: string;
}

function UserCheckList({
  label, employees, selected, onToggle,
}: {
  label: string;
  employees: Array<{ id: string; firstName: string; lastName: string; position: string | null }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 max-h-28 overflow-y-auto rounded-md border">
        {employees.map((e) => {
          const checked = selected.includes(e.id);
          return (
            <label
              key={e.id}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <input type="checkbox" checked={checked} onChange={() => onToggle(e.id)} className="h-3.5 w-3.5" />
              {e.firstName} {e.lastName}
              {e.position && <span className="text-xs text-gray-400">{e.position}</span>}
            </label>
          );
        })}
        {employees.length === 0 && <p className="p-2 text-xs text-gray-400">Нет сотрудников</p>}
      </div>
    </div>
  );
}

export function CreateTaskDialogFull({ open, onOpenChange, presetParentTaskId, presetGroupId }: Props) {
  const { employees, projects, taskGroups, taskTypes, taskLabels, createTask } = useCreateTaskFull();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [projectId, setProjectId] = useState('');
  const [groupId, setGroupId] = useState(presetGroupId ?? '');
  const [typeId, setTypeId] = useState('');
  const [executors, setExecutors] = useState<string[]>([]);
  const [controllers, setControllers] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function handleSubmit() {
    if (!title.trim() || !projectId || executors.length === 0) return;

    const data: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
      executors,
      controllers,
      observers,
      labelIds: selectedLabels,
      ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
      ...(plannedStart ? { plannedStartDate: new Date(plannedStart).toISOString() } : {}),
      ...(groupId ? { groupId } : {}),
      ...(typeId ? { typeId } : {}),
      ...(presetParentTaskId ? { parentTaskId: presetParentTaskId } : {}),
    };

    createTask.mutate(data, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
  }

  function resetForm() {
    setTitle(''); setDescription(''); setPriority('MEDIUM'); setDeadline('');
    setPlannedStart(''); setProjectId(''); setGroupId(presetGroupId ?? '');
    setTypeId(''); setExecutors([]); setControllers([]); setObservers([]); setSelectedLabels([]);
  }

  const canSubmit = title.trim().length > 0 && projectId.length > 0 && executors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>{presetParentTaskId ? 'Создать подчинённую задачу' : 'Новая задача'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 pb-2">
            <div>
              <Label htmlFor="task-title">Наименование *</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Название задачи" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Начало исполнения</Label>
                <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Срок исполнения</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" placeholder="Опишите задачу..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Объект строительства *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите объект" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Приоритет</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Низкий</SelectItem>
                    <SelectItem value="MEDIUM">Обычный</SelectItem>
                    <SelectItem value="HIGH">Высокий</SelectItem>
                    <SelectItem value="CRITICAL">Критичный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип задачи</Label>
                <Select value={typeId || 'NONE'} onValueChange={(v) => setTypeId(v === 'NONE' ? '' : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбран" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Не выбран</SelectItem>
                    {taskTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Группа задач</Label>
                <Select value={groupId || 'NONE'} onValueChange={(v) => setGroupId(v === 'NONE' ? '' : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбрана" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Не выбрана</SelectItem>
                    {taskGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {taskLabels.length > 0 && (
              <div>
                <Label>Метки</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {taskLabels.map((label) => {
                    const active = selectedLabels.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggle(selectedLabels, setSelectedLabels, label.id)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}
                        style={{ backgroundColor: label.color, color: '#fff', borderColor: label.color }}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <UserCheckList label="Исполнители *" employees={employees} selected={executors} onToggle={(id) => toggle(executors, setExecutors, id)} />
            <UserCheckList label="Контролёры" employees={employees} selected={controllers} onToggle={(id) => toggle(controllers, setControllers, id)} />
            <UserCheckList label="Наблюдатели" employees={employees} selected={observers} onToggle={(id) => toggle(observers, setObservers, id)} />
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createTask.isPending}>
            {createTask.isPending ? 'Создание...' : 'Создать задачу'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
