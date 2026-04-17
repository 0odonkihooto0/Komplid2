'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  activeView: string;
  onViewChange: (v: string) => void;
  children: ReactNode;
}

const VIEWS = [
  { key: 'list', label: 'Список задач' },
];

const ADDABLE_VIEWS = [
  { key: 'kanban', label: 'Канбан' },
  { key: 'calendar', label: 'Календарь' },
  { key: 'brief', label: 'Краткий список' },
  { key: 'feed', label: 'Лента новостей' },
];

export function PlannerViewTabs({ activeView, onViewChange, children }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Панель вкладок */}
      <div className="flex items-center border-b bg-white px-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeView === v.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {v.label}
          </button>
        ))}

        {/* Добавить представление (TASK.4) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {ADDABLE_VIEWS.map((v) => (
              <DropdownMenuItem key={v.key} disabled>
                {v.label} <span className="ml-auto text-[10px] text-gray-400">TASK.4</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Содержимое активного представления */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
