'use client';

import { useRef, useEffect, useState } from 'react';
import { Plus, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type TaskCounts } from './useGlobalTasks';

interface Props {
  search: string;
  period: string;
  counts: TaskCounts;
  onSearchChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  onCreateTask?: () => void;
  onCreateTemplate?: () => void;
  onSelectTemplate?: () => void;
}

const PERIODS = [
  { key: 'today', label: 'Сегодня', countKey: 'today' as const },
  { key: 'week', label: 'На неделю', countKey: 'week' as const },
  { key: 'all', label: 'Всё время', countKey: 'all' as const },
];

export function PlannerToolbar({ search, period, counts, onSearchChange, onPeriodChange, onCreateTask, onCreateTemplate, onSelectTemplate }: Props) {
  const [localSearch, setLocalSearch] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSearchChange(v: string) {
    setLocalSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearchChange(v), 300);
  }

  return (
    <div className="flex items-center gap-3 border-b bg-white px-4 py-2">
      {/* Кнопка создания задачи */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="shrink-0">
            <Plus className="mr-1 h-4 w-4" />
            Создать
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onCreateTask}>Задача</DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateTemplate}>Новый шаблон</DropdownMenuItem>
          <DropdownMenuItem onClick={onSelectTemplate}>На основе шаблона</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Фильтры по периоду */}
      <div className="flex items-center rounded-md border bg-gray-50 p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors',
              period === p.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {p.label}
            <span className={cn('text-[10px]', period === p.key ? 'text-blue-600' : 'text-gray-400')}>
              {counts[p.countKey]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Поиск с debounce 300ms */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <Input
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Поиск задач..."
          className="h-8 pl-8 text-sm"
        />
      </div>
    </div>
  );
}
