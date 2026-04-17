'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTaskTemplates, useInstantiateTemplate, type TaskTemplateItem } from './useTaskTemplates';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий', MEDIUM: 'Обычный', HIGH: 'Высокий', CRITICAL: 'Критичный',
};

interface BuildingObject {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SelectTemplateDialog({ open, onOpenChange }: Props) {
  const { templates, isLoading } = useTaskTemplates();
  const instantiate = useInstantiateTemplate();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TaskTemplateItem | null>(null);

  // Форма параметров создания задачи
  const [projectId, setProjectId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [executors, setExecutors] = useState<string[]>([]);
  const [controllers, setControllers] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);

  const { data: objects = [] } = useQuery<BuildingObject[]>({
    queryKey: ['building-objects-list'],
    queryFn: async () => {
      const res = await fetch('/api/objects');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data as Array<{ id: string; name: string }>);
    },
    staleTime: 60_000,
    enabled: open,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Employee[];
    },
    staleTime: 60_000,
    enabled: open,
  });

  function handleClose() {
    setSelected(null);
    setSearch('');
    setProjectId('');
    setDeadline('');
    setPlannedStart('');
    setExecutors([]);
    setControllers([]);
    setObservers([]);
    onOpenChange(false);
  }

  function toggleUser(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleCreate() {
    if (!selected || !projectId || executors.length === 0) return;

    await instantiate.mutateAsync({
      id: selected.id,
      projectId,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      plannedStartDate: plannedStart ? new Date(plannedStart).toISOString() : null,
      executors,
      controllers,
      observers,
    });
    handleClose();
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selected ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                На основе шаблона: {selected.name}
              </div>
            ) : (
              'Выбрать шаблон задачи'
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Шаг 1: список шаблонов */}
        {!selected && (
          <>
            <div className="relative px-0.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Поиск шаблона..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 max-h-96">
              {isLoading ? (
                <div className="space-y-2 p-1">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  {search ? 'Шаблоны не найдены' : 'Нет доступных шаблонов'}
                </p>
              ) : (
                <div className="space-y-1 p-1">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left rounded-md border px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setSelected(t)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        <span className="text-xs text-gray-400 ml-2">
                          {PRIORITY_LABELS[t.priority] ?? t.priority}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        {t.taskType && (
                          <span className="text-xs text-gray-500">{t.taskType.name}</span>
                        )}
                        {t.group && (
                          <span className="text-xs text-gray-500">{t.group.name}</span>
                        )}
                        {t.duration && (
                          <span className="text-xs text-gray-400">
                            {t.duration % 1440 === 0
                              ? `${t.duration / 1440} дн`
                              : `${t.duration / 60} ч`}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {/* Шаг 2: параметры создания задачи */}
        {selected && (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 px-0.5 pb-2">
              {/* Объект строительства */}
              <div className="space-y-1.5">
                <Label>Объект строительства *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выбрать объект..." />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Даты */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inst-start">Плановое начало</Label>
                  <Input
                    id="inst-start"
                    type="date"
                    value={plannedStart}
                    onChange={(e) => setPlannedStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-deadline">Срок</Label>
                  <Input
                    id="inst-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              {/* Исполнители */}
              <UserMultiSelect
                label="Исполнители *"
                employees={employees}
                selected={executors}
                onChange={setExecutors}
                onToggle={(id) => toggleUser(executors, setExecutors, id)}
              />

              {/* Контролёры */}
              <UserMultiSelect
                label="Контролёры"
                employees={employees}
                selected={controllers}
                onChange={setControllers}
                onToggle={(id) => toggleUser(controllers, setControllers, id)}
              />

              {/* Наблюдатели */}
              <UserMultiSelect
                label="Наблюдатели"
                employees={employees}
                selected={observers}
                onChange={setObservers}
                onToggle={(id) => toggleUser(observers, setObservers, id)}
              />
            </div>
          </ScrollArea>
        )}

        {selected && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Отмена</Button>
            <Button
              onClick={handleCreate}
              disabled={!projectId || executors.length === 0 || instantiate.isPending}
            >
              {instantiate.isPending ? 'Создание...' : 'Создать задачу'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Вспомогательный компонент выбора пользователей ──────────────────────────

interface UserMultiSelectProps {
  label: string;
  employees: Employee[];
  selected: string[];
  onChange: (v: string[]) => void;
  onToggle: (id: string) => void;
}

function UserMultiSelect({ label, employees, selected, onToggle }: UserMultiSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="max-h-32 overflow-y-auto rounded-md border">
        {employees.length === 0 ? (
          <p className="p-2 text-xs text-gray-400">Нет сотрудников</p>
        ) : (
          employees.map((e) => {
            const isSelected = selected.includes(e.id);
            return (
              <label
                key={e.id}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(e.id)}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span className={isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                  {e.firstName} {e.lastName}
                </span>
                {e.position && (
                  <span className="text-xs text-gray-400">{e.position}</span>
                )}
              </label>
            );
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500">Выбрано: {selected.length}</p>
      )}
    </div>
  );
}
