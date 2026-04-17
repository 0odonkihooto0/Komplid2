'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Paperclip, X, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import { useTaskGroups } from './useTaskGroups';
import {
  useTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate,
  type TaskTemplateDetail,
} from './useTaskTemplates';
import { useTaskSchedules, useUpdateSchedule, useDeleteSchedule } from './useTaskSchedules';
import { AddScheduleDialog } from './AddScheduleDialog';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий', MEDIUM: 'Обычный', HIGH: 'Высокий', CRITICAL: 'Критичный',
};

const REPEAT_LABELS: Record<string, string> = {
  DAY: 'день', WEEK: 'неделю', MONTH: 'месяц', YEAR: 'год',
};

const WEEK_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes % 1440 === 0) return `${minutes / 1440} дн`;
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  return `${minutes} мин`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function scheduleLabel(s: { repeatType: string; interval: number; weekDays: number[]; monthDays: number[] }): string {
  const every = `Каждые ${s.interval} ${REPEAT_LABELS[s.repeatType] ?? s.repeatType}`;
  if (s.repeatType === 'WEEK' && s.weekDays.length > 0) {
    const days = s.weekDays.map((d) => WEEK_NAMES[d]).join(', ');
    return `${every} (${days})`;
  }
  if (s.repeatType === 'MONTH' && s.monthDays.length > 0) {
    return `${every} (${s.monthDays.join(', ')} числа)`;
  }
  return every;
}

function extractFileName(s3Key: string): string {
  const parts = s3Key.split('/');
  const last = parts[parts.length - 1] ?? s3Key;
  const withoutTimestamp = last.replace(/^\d+_/, '');
  return withoutTimestamp;
}

// ─── Вкладка Параметры ────────────────────────────────────────────────────────

function ParamsTab({ template }: { template: TaskTemplateDetail }) {
  const { groups } = useTaskGroups();
  const updateMutation = useUpdateTaskTemplate();
  const deleteMutation = useDeleteTaskTemplate();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? '');
  const [groupId, setGroupId] = useState<string>(template.groupId ?? 'NONE');
  const [priority, setPriority] = useState(template.priority);
  const [durationValue, setDurationValue] = useState(() => {
    if (!template.duration) return '';
    if (template.duration % 1440 === 0) return String(template.duration / 1440);
    return String(template.duration / 60);
  });
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>(() => {
    if (!template.duration) return 'hours';
    return template.duration % 1440 === 0 ? 'days' : 'hours';
  });

  async function handleSave() {
    let duration: number | null = null;
    const val = parseFloat(durationValue);
    if (!isNaN(val) && val > 0) {
      duration = durationUnit === 'days' ? Math.round(val * 1440) : Math.round(val * 60);
    }
    await updateMutation.mutateAsync({
      id: template.id,
      name,
      description: description || null,
      groupId: groupId === 'NONE' ? null : groupId,
      priority,
      duration,
    });
    setEditing(false);
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Отмена</Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Редактировать</Button>
        )}
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Название</Label>
          {editing
            ? <Input value={name} onChange={(e) => setName(e.target.value)} />
            : <p className="text-sm text-gray-900">{template.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Описание</Label>
          {editing
            ? <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            : <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.description || '—'}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Тип задачи</Label>
            <p className="text-sm text-gray-600">{template.taskType?.name ?? '—'}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Группа</Label>
            {editing ? (
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Не указана" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Не указана</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-600">{template.group?.name ?? '—'}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Приоритет</Label>
            {editing ? (
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-600">{PRIORITY_LABELS[template.priority] ?? template.priority}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Длительность</Label>
            {editing ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  className="flex-1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                />
                <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as 'hours' | 'days')}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">ч</SelectItem>
                    <SelectItem value="days">дн</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{formatDuration(template.duration)}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Автор</Label>
          <p className="text-sm text-gray-600">
            {template.author.firstName} {template.author.lastName}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Создан</Label>
          <p className="text-sm text-gray-600">{formatDate(template.createdAt)}</p>
        </div>

        {template.parentTemplate && (
          <div className="space-y-1.5">
            <Label>Шаблон-основание</Label>
            <p className="text-sm text-gray-600">{template.parentTemplate.name}</p>
          </div>
        )}

        {template.children.length > 0 && (
          <div className="space-y-1.5">
            <Label>Дочерние шаблоны ({template.children.length})</Label>
            <div className="space-y-1">
              {template.children.map((c) => (
                <div key={c.id} className="rounded border px-3 py-1.5 text-sm text-gray-700">
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm('Удалить шаблон? Все связанные расписания будут также удалены.')) {
                void deleteMutation.mutateAsync(template.id);
              }
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Удалить шаблон
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Вкладка Расписание ───────────────────────────────────────────────────────

function ScheduleTab({ templateId }: { templateId: string }) {
  const { schedules, isLoading } = useTaskSchedules(templateId);
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-3 p-1">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить расписание
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-sm text-gray-500">Нет расписаний</p>
          <p className="text-xs text-gray-400 mt-1">Задачи будут создаваться вручную</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{scheduleLabel(s)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  с {formatDate(s.startDate)}
                  {s.endDate ? ` по ${formatDate(s.endDate)}` : ''}
                  {s.createSubTasks && ' · подзадачи'}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <Switch
                  checked={s.isActive}
                  onCheckedChange={(v) => {
                    void updateSchedule.mutateAsync({ id: s.id, templateId, isActive: v });
                  }}
                />
                <button
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => {
                    if (confirm('Удалить расписание?')) {
                      void deleteSchedule.mutateAsync({ id: s.id, templateId });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddScheduleDialog open={addOpen} onOpenChange={setAddOpen} templateId={templateId} />
    </div>
  );
}

// ─── Вкладка Файлы ────────────────────────────────────────────────────────────

function FilesTab({ template }: { template: TaskTemplateDetail }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateTaskTemplate();
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await fetch('/api/task-templates/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const { uploadUrl, s3Key } = json.data as { uploadUrl: string; s3Key: string };

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      await updateMutation.mutateAsync({
        id: template.id,
        s3Keys: [...template.s3Keys, s3Key],
      });
      toast({ title: 'Файл прикреплён' });
    } catch (err) {
      toast({ title: 'Ошибка загрузки', description: String(err), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove(s3Key: string) {
    await updateMutation.mutateAsync({
      id: template.id,
      s3Keys: template.s3Keys.filter((k) => k !== s3Key),
    });
    toast({ title: 'Файл удалён из шаблона' });
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="mr-1 h-4 w-4" />
          {uploading ? 'Загрузка...' : 'Прикрепить файл'}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      </div>

      {template.s3Keys.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Paperclip className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Нет прикреплённых файлов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {template.s3Keys.map((key) => (
            <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-gray-700 truncate flex-1">{extractFileName(key)}</span>
              <button
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => void handleRemove(key)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Вкладка Созданные задачи ─────────────────────────────────────────────────

interface CreatedTask {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыта', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе',
  UNDER_REVIEW: 'На проверке', REVISION: 'На доработке', DONE: 'Выполнена',
  IRRELEVANT: 'Неактуальна', CANCELLED: 'Отменена',
};

function CreatedTasksTab({ templateId }: { templateId: string }) {
  const { data, isLoading } = useQuery<{ data: CreatedTask[]; total: number }>({
    queryKey: ['template-tasks', templateId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?templateId=${templateId}&pageSize=20`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { data: CreatedTask[]; total: number };
    },
    staleTime: 30_000,
  });

  const tasks = data?.data ?? [];

  return (
    <div className="space-y-2 p-1">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-sm text-gray-500">Задач ещё нет</p>
          <p className="text-xs text-gray-400 mt-1">Задачи появятся здесь после первого запуска</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 pb-1">Всего: {data?.total ?? 0}</p>
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 truncate">{t.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {TASK_STATUS_LABELS[t.status] ?? t.status} · {formatDate(t.createdAt)}
                </p>
              </div>
              <a
                href={`/planner?taskId=${t.id}`}
                className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Перейти к задаче"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Основной компонент ────────────────────────────────────────────────────────

interface Props {
  templateId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TaskTemplateCard({ templateId, open, onOpenChange }: Props) {
  const { template, isLoading } = useTaskTemplate(templateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Шаблон...' : (template?.name ?? 'Шаблон задачи')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !template ? (
          <div className="p-4 text-center text-sm text-gray-500">Шаблон не найден</div>
        ) : (
          <Tabs defaultValue="params" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="mx-4 mt-1 grid w-auto grid-cols-4">
              <TabsTrigger value="params">Параметры</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="files">
                Файлы{template.s3Keys.length > 0 && ` (${template.s3Keys.length})`}
              </TabsTrigger>
              <TabsTrigger value="tasks">Задачи</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <TabsContent value="params" className="mt-0">
                <ParamsTab template={template} />
              </TabsContent>
              <TabsContent value="schedule" className="mt-0">
                <ScheduleTab templateId={templateId} />
              </TabsContent>
              <TabsContent value="files" className="mt-0">
                <FilesTab template={template} />
              </TabsContent>
              <TabsContent value="tasks" className="mt-0">
                <CreatedTasksTab templateId={templateId} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
