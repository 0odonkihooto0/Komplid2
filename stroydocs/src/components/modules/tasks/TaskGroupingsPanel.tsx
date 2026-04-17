'use client';

import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type TaskCounts, DEFAULT_TASK_COUNTS } from './useGlobalTasks';
import { type TaskGroupItem } from './useTaskGroups';
import { CreateTaskGroupDialog } from './CreateTaskGroupDialog';
import { CreateTaskLabelDialog } from './CreateTaskLabelDialog';

interface Props {
  selectedGrouping: string;
  selectedGroupId: string | null;
  counts: TaskCounts;
  groups: TaskGroupItem[];
  groupTree: TaskGroupItem[];
  templateCount?: number;
  onGroupingChange: (g: string) => void;
  onGroupIdChange: (id: string | null) => void;
}

// Стандартные группировки панели
const STANDARD_GROUPINGS = [
  { key: 'active', label: 'Активные задачи' },
  { key: 'executor', label: 'Выполняю' },
  { key: 'controller', label: 'Контролирую' },
  { key: 'observer', label: 'Наблюдаю' },
  { key: 'author', label: 'Созданные мной' },
  { key: 'irrelevant', label: 'Неактуальные' },
  { key: 'overdue', label: 'Просроченные', isOverdue: true },
  { key: 'completed', label: 'Выполненные' },
] as const;

// Кнопка одной группировки
function GroupingItem({ label, count, isActive, isOverdue, onClick }: {
  label: string; count: number; isActive: boolean; isOverdue?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100',
      )}
    >
      {isOverdue && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs text-gray-400">{count}</span>
    </button>
  );
}

// Узел дерева группы задач
function TaskGroupNode({ group, selectedGroupId, depth, onSelect, onCreateChild, onCreateLabel }: {
  group: TaskGroupItem;
  selectedGroupId: string | null;
  depth: number;
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onCreateLabel: (groupId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (group.children?.length ?? 0) > 0;
  const isActive = selectedGroupId === group.id;

  function copyGroupLink() {
    void navigator.clipboard.writeText(`${window.location.origin}/planner?groupId=${group.id}`);
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mr-1 flex h-4 w-4 shrink-0 items-center justify-center"
        >
          {hasChildren
            ? (expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
            : <span className="h-3 w-3" />}
        </button>
        <button className="flex-1 text-left" onClick={() => onSelect(group.id)}>
          {group.name}
          <span className="ml-1 text-xs text-gray-400">{group._count.tasks}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="invisible flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200 group-hover:visible">
              <MoreVertical className="h-3 w-3 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onCreateChild(group.id)}>Добавить подчинённый пункт</DropdownMenuItem>
            <DropdownMenuItem disabled>Редактировать</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateLabel(group.id)}>Добавить метку для задач</DropdownMenuItem>
            <DropdownMenuItem disabled>Список меток для задач</DropdownMenuItem>
            <DropdownMenuItem onClick={copyGroupLink}>Скопировать ссылку на группу</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && (
        <div>
          {group.children!.map((child) => (
            <TaskGroupNode
              key={child.id}
              group={child}
              selectedGroupId={selectedGroupId}
              depth={depth + 1}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onCreateLabel={onCreateLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskGroupingsPanel({
  selectedGrouping, selectedGroupId, counts, groupTree, templateCount,
  onGroupingChange, onGroupIdChange,
}: Props) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupParentId, setCreateGroupParentId] = useState<string | undefined>(undefined);
  const [createLabelOpen, setCreateLabelOpen] = useState(false);
  const [createLabelGroupId, setCreateLabelGroupId] = useState<string | undefined>(undefined);

  function handleCreateChild(parentId: string) {
    setCreateGroupParentId(parentId);
    setCreateGroupOpen(true);
  }
  function handleCreateLabel(groupId: string) {
    setCreateLabelGroupId(groupId);
    setCreateLabelOpen(true);
  }
  function handleSelectGroup(id: string) {
    onGroupingChange('group');
    onGroupIdChange(id);
  }

  return (
    <div className="flex h-full flex-col border-r bg-white">
      {/* Заголовок */}
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-gray-900 text-sm">Планировщик задач</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Все задачи */}
        <div className="px-2 pb-1">
          <GroupingItem
            label="Все задачи"
            count={counts.all}
            isActive={selectedGrouping === 'all' && !selectedGroupId}
            onClick={() => { onGroupingChange('all'); onGroupIdChange(null); }}
          />
        </div>

        {/* Стандартные группировки */}
        <div className="px-2 pb-2">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Стандартные
          </p>
          {STANDARD_GROUPINGS.map((g) => (
            <GroupingItem
              key={g.key}
              label={g.label}
              count={counts[g.key as keyof TaskCounts] as number}
              isActive={selectedGrouping === g.key && !selectedGroupId}
              isOverdue={'isOverdue' in g ? g.isOverdue : false}
              onClick={() => { onGroupingChange(g.key); onGroupIdChange(null); }}
            />
          ))}
        </div>

        {/* Шаблоны */}
        <div className="px-2 pb-2">
          <GroupingItem
            label="Шаблоны"
            count={templateCount ?? 0}
            isActive={selectedGrouping === 'templates'}
            onClick={() => { onGroupingChange('templates'); onGroupIdChange(null); }}
          />
        </div>

        {/* Группы задач */}
        <div className="px-2">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Группы задач
            </p>
            <button
              onClick={() => { setCreateGroupParentId(undefined); setCreateGroupOpen(true); }}
              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {groupTree.map((group) => (
            <TaskGroupNode
              key={group.id}
              group={group}
              selectedGroupId={selectedGroupId}
              depth={0}
              onSelect={handleSelectGroup}
              onCreateChild={handleCreateChild}
              onCreateLabel={handleCreateLabel}
            />
          ))}
          {groupTree.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Нет групп задач</p>
          )}
        </div>
      </div>

      <CreateTaskGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        defaultParentId={createGroupParentId}
      />
      <CreateTaskLabelDialog
        open={createLabelOpen}
        onOpenChange={setCreateLabelOpen}
        defaultGroupId={createLabelGroupId}
      />
    </div>
  );
}
