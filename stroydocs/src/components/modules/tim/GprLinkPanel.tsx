'use client';

import { Link2, Unlink, MoreHorizontal, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useCreateLink,
  useDeleteLink,
  useGanttVersionsForViewer,
  useGanttTasksForViewer,
} from './useModelViewer';
import type { BimElementLink, GanttTaskViewer } from './useModelViewer';

interface Props {
  elementId: string;
  modelId: string;
  projectId: string;
  links: BimElementLink[];
  selectedVersionId: string | null;
  onVersionChange: (id: string | null) => void;
  onFollowWork: (taskId: string) => void;
}

/** Цвет Badge по статусу задачи */
function statusBadge(status: GanttTaskViewer['status']) {
  const map: Record<GanttTaskViewer['status'], { label: string; className: string }> = {
    NOT_STARTED: { label: 'Не начата', className: 'bg-muted text-muted-foreground' },
    IN_PROGRESS: { label: 'В работе', className: 'bg-blue-100 text-blue-700' },
    COMPLETED:   { label: 'Завершена', className: 'bg-green-100 text-green-700' },
    DELAYED:     { label: 'Просрочена', className: 'bg-red-100 text-red-700' },
    ON_HOLD:     { label: 'На паузе', className: 'bg-yellow-100 text-yellow-700' },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}

export function GprLinkPanel({
  elementId,
  modelId,
  projectId,
  links,
  selectedVersionId,
  onVersionChange,
  onFollowWork,
}: Props) {
  const { data: versions, isLoading: loadingVersions } = useGanttVersionsForViewer(projectId);
  const { data: tasksData, isLoading: loadingTasks } = useGanttTasksForViewer(
    projectId,
    selectedVersionId
  );

  const createLink = useCreateLink(projectId);
  const deleteLink = useDeleteLink(projectId, modelId, elementId);

  // Задачи ГПР привязанные к текущему элементу (только GanttTask-тип)
  const gprLinks = links.filter(l => l.entityType === 'GanttTask');

  function isLinked(taskId: string): boolean {
    return gprLinks.some(l => l.entityId === taskId);
  }

  function getLinkId(taskId: string): string | undefined {
    return gprLinks.find(l => l.entityId === taskId)?.id;
  }

  function handleBind(task: GanttTaskViewer) {
    createLink.mutate({ elementId, modelId, entityType: 'GanttTask', entityId: task.id });
  }

  function handleUnbind(task: GanttTaskViewer) {
    const linkId = getLinkId(task.id);
    if (linkId) deleteLink.mutate(linkId);
  }

  const tasks = tasksData?.tasks ?? [];

  return (
    <div className="space-y-3">
      {/* Выбор версии ГПР */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Версия ГПР</p>
        <Select
          value={selectedVersionId ?? ''}
          onValueChange={val => onVersionChange(val || null)}
          disabled={loadingVersions}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Выберите версию ГПР…" />
          </SelectTrigger>
          <SelectContent>
            {(versions ?? []).map(v => (
              <SelectItem key={v.id} value={v.id} className="text-xs">
                {v.name}
                {v.isBaseline && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(базовая)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Список позиций ГПР */}
      {!selectedVersionId ? (
        <p className="text-xs text-muted-foreground">Выберите версию ГПР для просмотра позиций</p>
      ) : loadingTasks ? (
        <p className="text-xs text-muted-foreground">Загрузка позиций…</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Нет позиций в этой версии ГПР</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map(task => {
            const linked = isLinked(task.id);
            return (
              <li
                key={task.id}
                className="flex items-center gap-1.5 rounded bg-muted/40 px-2 py-1.5"
                style={{ paddingLeft: `${0.5 + task.level * 0.75}rem` }}
              >
                {/* Иконка привязки */}
                {linked ? (
                  <Link2 className="h-3 w-3 shrink-0 text-primary" />
                ) : (
                  <span className="h-3 w-3 shrink-0" />
                )}

                {/* Название задачи */}
                <span className="flex-1 truncate text-xs" title={task.name}>
                  {task.name}
                </span>

                {/* Статус */}
                {statusBadge(task.status)}

                {/* Меню действий ⋮ */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    {linked ? (
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => handleUnbind(task)}
                        disabled={deleteLink.isPending}
                      >
                        <Unlink className="h-3 w-3" />
                        Отвязать
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleBind(task)}
                        disabled={createLink.isPending}
                      >
                        <Link2 className="h-3 w-3" />
                        Привязать
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => onFollowWork(task.id)}
                    >
                      <Navigation className="h-3 w-3" />
                      Следовать за работой
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
