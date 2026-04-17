'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TaskGroupingsPanel } from '@/components/modules/tasks/TaskGroupingsPanel';
import { PlannerToolbar } from '@/components/modules/tasks/PlannerToolbar';
import { PlannerViewTabs, type OpenView, type ViewType } from '@/components/modules/tasks/PlannerViewTabs';
import { TaskListView } from '@/components/modules/tasks/TaskListView';
import { TaskKanbanView } from '@/components/modules/tasks/TaskKanbanView';
import { TaskCalendarView } from '@/components/modules/tasks/TaskCalendarView';
import { TaskBriefListView } from '@/components/modules/tasks/TaskBriefListView';
import { TaskFeedView } from '@/components/modules/tasks/TaskFeedView';
import { TaskTemplatesView } from '@/components/modules/tasks/TaskTemplatesView';
import { CreateTaskTemplateDialog } from '@/components/modules/tasks/CreateTaskTemplateDialog';
import { SelectTemplateDialog } from '@/components/modules/tasks/SelectTemplateDialog';
import { TaskDetailDialog } from '@/components/modules/tasks/TaskDetailDialog';
import { CreateTaskDialogFull } from '@/components/modules/tasks/CreateTaskDialogFull';
import { useGlobalTasks } from '@/components/modules/tasks/useGlobalTasks';
import { useTaskGroups } from '@/components/modules/tasks/useTaskGroups';
import { useTaskTemplates } from '@/components/modules/tasks/useTaskTemplates';

const VIEWS_KEY = 'stroydocs-planner-views';
const ACTIVE_KEY = 'stroydocs-planner-active';

const VIEW_LABELS: Record<ViewType, string> = {
  list: 'Список задач',
  kanban: 'Канбан',
  calendar: 'Календарь',
  brief: 'Краткий список',
  feed: 'Лента новостей',
};

const DEFAULT_VIEWS: OpenView[] = [
  { id: 'list-default', type: 'list', label: 'Список задач' },
];

function loadViews(): OpenView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return DEFAULT_VIEWS;
    const parsed = JSON.parse(raw) as OpenView[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VIEWS;
  } catch {
    return DEFAULT_VIEWS;
  }
}

function loadActiveId(views: OpenView[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_KEY);
    if (saved && views.some((v) => v.id === saved)) return saved;
  } catch { /* ok */ }
  return views[0].id;
}

export default function PlannerPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const router = useRouter();

  // Инициализация из localStorage только на клиенте
  const [openViews, setOpenViews] = useState<OpenView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState<string>(DEFAULT_VIEWS[0].id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const views = loadViews();
    setOpenViews(views);
    setActiveViewId(loadActiveId(views));
    setMounted(true);
  }, []);

  // Инициализация фильтров из URL при монтировании
  const [grouping, setGrouping] = useState('all');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);

  // Диалоги
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [selectTemplateOpen, setSelectTemplateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGrouping(params.get('grouping') ?? 'all');
    setGroupId(params.get('groupId'));
    setSearch(params.get('search') ?? '');
    setPeriod(params.get('period') ?? 'all');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(VIEWS_KEY, JSON.stringify(openViews));
  }, [openViews, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(ACTIVE_KEY, activeViewId);
  }, [activeViewId, mounted]);

  // Синхронизация фильтров с URL
  useEffect(() => {
    const sp = new URLSearchParams();
    if (grouping !== 'all') sp.set('grouping', grouping);
    if (groupId) sp.set('groupId', groupId);
    if (search) sp.set('search', search);
    if (period !== 'all') sp.set('period', period);
    const qs = sp.toString();
    router.replace(`/planner${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [grouping, groupId, search, period, router]);

  const { tasks, counts, total, totalPages, isLoading } = useGlobalTasks({
    grouping, groupId, search, period, page,
  });

  const { groups, groupTree } = useTaskGroups();
  const { templates } = useTaskTemplates();

  const activeView = openViews.find((v) => v.id === activeViewId) ?? openViews[0];

  const addView = useCallback((type: ViewType) => {
    const newView: OpenView = { id: `${type}-${Date.now()}`, type, label: VIEW_LABELS[type] };
    setOpenViews((prev) => [...prev, newView]);
    setActiveViewId(newView.id);
  }, []);

  const closeView = useCallback((id: string) => {
    setOpenViews((prev) => {
      const remaining = prev.filter((v) => v.id !== id);
      return remaining.length > 0 ? remaining : DEFAULT_VIEWS;
    });
    setActiveViewId((prev) => {
      if (prev !== id) return prev;
      const remaining = openViews.filter((v) => v.id !== id);
      return remaining[0]?.id ?? DEFAULT_VIEWS[0].id;
    });
  }, [openViews]);

  function handleGroupingChange(g: string) { setGrouping(g); setPage(1); }
  function handleGroupIdChange(gid: string | null) { setGroupId(gid); setPage(1); }
  function handleSearchChange(v: string) { setSearch(v); setPage(1); }
  function handlePeriodChange(v: string) { setPeriod(v); setPage(1); }

  const isTemplatesView = grouping === 'templates';

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      <div className="w-[300px] shrink-0 overflow-y-auto">
        <TaskGroupingsPanel
          selectedGrouping={grouping}
          selectedGroupId={groupId}
          counts={counts}
          groups={groups}
          groupTree={groupTree}
          templateCount={templates.length}
          onGroupingChange={handleGroupingChange}
          onGroupIdChange={handleGroupIdChange}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden border-l">
        <PlannerToolbar
          search={search}
          period={period}
          counts={counts}
          onSearchChange={handleSearchChange}
          onPeriodChange={handlePeriodChange}
          onCreateTask={() => setCreateTaskOpen(true)}
          onCreateTemplate={() => setCreateTemplateOpen(true)}
          onSelectTemplate={() => setSelectTemplateOpen(true)}
        />

        {isTemplatesView ? (
          <TaskTemplatesView />
        ) : (
          <PlannerViewTabs
            openViews={openViews}
            activeViewId={activeViewId}
            onViewChange={setActiveViewId}
            onAddView={addView}
            onCloseView={closeView}
          >
            {activeView.type === 'list' && (
              <TaskListView
                tasks={tasks}
                isLoading={isLoading}
                total={total}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onTaskClick={setSelectedTaskId}
              />
            )}
            {activeView.type === 'kanban' && (
              <TaskKanbanView
                currentUserId={currentUserId}
                grouping={grouping}
                groupId={groupId}
                search={search}
                onTaskClick={setSelectedTaskId}
              />
            )}
            {activeView.type === 'calendar' && (
              <TaskCalendarView
                grouping={grouping}
                groupId={groupId}
                search={search}
              />
            )}
            {activeView.type === 'brief' && (
              <TaskBriefListView
                tasks={tasks}
                isLoading={isLoading}
                onTaskClick={setSelectedTaskId}
              />
            )}
            {activeView.type === 'feed' && (
              <TaskFeedView
                grouping={grouping}
                groupId={groupId ?? undefined}
                search={search}
              />
            )}
          </PlannerViewTabs>
        )}
      </div>

      <CreateTaskTemplateDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
      />
      <SelectTemplateDialog
        open={selectTemplateOpen}
        onOpenChange={setSelectTemplateOpen}
      />
      <TaskDetailDialog
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
      <CreateTaskDialogFull
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
      />
    </div>
  );
}
