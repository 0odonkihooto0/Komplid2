'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CalendarRange, List, BarChart2, Plus, Wand2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { GanttVersionPanel } from '@/components/modules/gantt/GanttVersionPanel';
import { GanttList } from '@/components/modules/gantt/GanttList';
import { GanttAnalytics } from '@/components/modules/gantt/GanttAnalytics';
import { GanttDependencyDialog } from '@/components/modules/gantt/GanttDependencyDialog';
import { CreateGanttTaskDialog } from '@/components/modules/gantt/CreateGanttTaskDialog';
import { useGanttVersions, useCreateVersion } from '@/components/modules/gantt/useGanttVersions';
import { useGanttTasks, useAutoFill } from '@/components/modules/gantt/useGanttTasks';

// SSR-несовместима — загружаем только на клиенте
const GanttChart = dynamic(
  () => import('@/components/modules/gantt/GanttChart').then((m) => ({ default: m.GanttChart })),
  { ssr: false, loading: () => <Skeleton className="h-[500px] w-full" /> },
);

type View = 'gantt' | 'list' | 'analytics';

interface Props {
  projectId: string;
  contractId: string;
}

export function GanttContent({ projectId, contractId }: Props) {
  const [view, setView] = useState<View>('gantt');
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [depsOpen, setDepsOpen] = useState(false);

  const { versions, isLoading: versionsLoading } = useGanttVersions(projectId, contractId);
  const createVersion = useCreateVersion(projectId, contractId);
  const autoFill = useAutoFill(projectId, contractId, activeVersionId ?? '');
  const { data } = useGanttTasks(projectId, contractId, activeVersionId);

  // Автоматически выбираем активную версию при загрузке
  useEffect(() => {
    if (versions.length === 0 || activeVersionId) return;
    const active = versions.find((v) => v.isActive) ?? versions[0];
    setActiveVersionId(active.id);
  }, [versions, activeVersionId]);

  // Статистика для нижней панели
  const tasks = data.tasks;
  const leaves = tasks.filter((t) => !tasks.some((o) => o.parentId === t.id));
  const completed = leaves.filter((t) => t.progress >= 100).length;
  const today = new Date();
  const delayed = leaves.filter((t) => new Date(t.planEnd) < today && t.progress < 100).length;
  const critical = leaves.filter((t) => t.isCritical).length;

  function handleCreateFirstVersion() {
    createVersion.mutate({ name: 'Начальная версия', isBaseline: true }, {
      onSuccess: (v) => setActiveVersionId(v.id),
    });
  }

  if (versionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Нет ни одной версии — предлагаем создать
  if (versions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <CalendarRange className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">График ещё не создан</p>
        <Button onClick={handleCreateFirstVersion} disabled={createVersion.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Создать график
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex flex-wrap items-center gap-2">
        <GanttVersionPanel
          projectId={projectId}
          contractId={contractId}
          versions={versions}
          activeVersionId={activeVersionId}
          onVersionChange={setActiveVersionId}
        />

        <div className="flex gap-1 rounded-md border p-1">
          <Button
            variant={view === 'gantt' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('gantt')}
          >
            <CalendarRange className="mr-1 h-4 w-4" />
            Ганнт
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="mr-1 h-4 w-4" />
            Список
          </Button>
          <Button
            variant={view === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('analytics')}
          >
            <BarChart2 className="mr-1 h-4 w-4" />
            Аналитика
          </Button>
        </div>

        <div className="flex-1" />

        {activeVersionId && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoFill.mutate()}
              disabled={autoFill.isPending}
            >
              <Wand2 className="mr-1 h-4 w-4" />
              Автозаполнение
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepsOpen(true)}
            >
              <GitBranch className="mr-1 h-4 w-4" />
              Зависимости
            </Button>
            <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Задача
            </Button>
          </>
        )}
      </div>

      {/* Основное содержимое */}
      {activeVersionId && (
        <>
          {view === 'gantt' && (
            <GanttChart
              projectId={projectId}
              contractId={contractId}
              versionId={activeVersionId}
            />
          )}
          {view === 'list' && (
            <GanttList
              projectId={projectId}
              contractId={contractId}
              versionId={activeVersionId}
            />
          )}
          {view === 'analytics' && (
            <GanttAnalytics
              projectId={projectId}
              contractId={contractId}
              versionId={activeVersionId}
            />
          )}
        </>
      )}

      {/* Нижняя статистика */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
          <span>Задач: <strong>{leaves.length}</strong></span>
          <span className="text-green-600">Выполнено: <strong>{completed}</strong></span>
          {delayed > 0 && (
            <span className="text-destructive">Задержка: <strong>{delayed}</strong></span>
          )}
          {critical > 0 && (
            <span className="text-red-600">Крит. путь: <strong>{critical}</strong></span>
          )}
        </div>
      )}

      {/* Диалоги */}
      {activeVersionId && (
        <>
          <CreateGanttTaskDialog
            open={createTaskOpen}
            onOpenChange={setCreateTaskOpen}
            projectId={projectId}
            contractId={contractId}
            versionId={activeVersionId}
            parentTasks={tasks.filter((t) => t.level === 0)}
          />
          <GanttDependencyDialog
            open={depsOpen}
            onOpenChange={setDepsOpen}
            projectId={projectId}
            contractId={contractId}
            versionId={activeVersionId}
            tasks={tasks}
            dependencies={data.dependencies}
          />
        </>
      )}
    </div>
  );
}
