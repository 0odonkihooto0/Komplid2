'use client';

import { useState } from 'react';
import { TaskGroupingsPanel } from '@/components/modules/tasks/TaskGroupingsPanel';
import { PlannerToolbar } from '@/components/modules/tasks/PlannerToolbar';
import { PlannerViewTabs } from '@/components/modules/tasks/PlannerViewTabs';
import { TaskListView } from '@/components/modules/tasks/TaskListView';
import { useGlobalTasks } from '@/components/modules/tasks/useGlobalTasks';
import { useTaskGroups } from '@/components/modules/tasks/useTaskGroups';

export default function PlannerPage() {
  const [grouping, setGrouping] = useState('all');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState('list');

  const { tasks, counts, total, totalPages, isLoading } = useGlobalTasks({
    grouping,
    groupId,
    search,
    period,
    page,
  });

  const { groups, groupTree } = useTaskGroups();

  function handleGroupingChange(g: string) {
    setGrouping(g);
    setPage(1);
  }

  function handleGroupIdChange(id: string | null) {
    setGroupId(id);
    setPage(1);
  }

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handlePeriodChange(v: string) {
    setPeriod(v);
    setPage(1);
  }

  return (
    // -m-6 компенсирует p-6 dashboard layout; h-full заполняет доступную высоту main
    <div className="flex h-full -m-6 overflow-hidden">
      {/* Левая панель группировок 300px */}
      <div className="w-[300px] shrink-0 overflow-y-auto">
        <TaskGroupingsPanel
          selectedGrouping={grouping}
          selectedGroupId={groupId}
          counts={counts}
          groups={groups}
          groupTree={groupTree}
          onGroupingChange={handleGroupingChange}
          onGroupIdChange={handleGroupIdChange}
        />
      </div>

      {/* Правая область */}
      <div className="flex flex-1 flex-col overflow-hidden border-l">
        <PlannerToolbar
          search={search}
          period={period}
          counts={counts}
          onSearchChange={handleSearchChange}
          onPeriodChange={handlePeriodChange}
        />
        <PlannerViewTabs activeView={activeView} onViewChange={setActiveView}>
          <TaskListView
            tasks={tasks}
            isLoading={isLoading}
            total={total}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </PlannerViewTabs>
      </div>
    </div>
  );
}
