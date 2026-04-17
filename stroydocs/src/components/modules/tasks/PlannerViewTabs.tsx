'use client';

import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ViewType = 'list' | 'kanban' | 'calendar' | 'brief' | 'feed';

export interface OpenView {
  id: string;
  type: ViewType;
  label: string;
}

interface Props {
  openViews: OpenView[];
  activeViewId: string;
  onViewChange: (id: string) => void;
  onAddView: (type: ViewType) => void;
  onCloseView: (id: string) => void;
  children: ReactNode;
}

const ADDABLE_VIEWS: Array<{ type: ViewType; label: string }> = [
  { type: 'list', label: 'Список задач' },
  { type: 'kanban', label: 'Канбан' },
  { type: 'calendar', label: 'Календарь' },
  { type: 'brief', label: 'Краткий список' },
  { type: 'feed', label: 'Лента новостей' },
];

export function PlannerViewTabs({
  openViews, activeViewId, onViewChange, onAddView, onCloseView, children,
}: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center border-b bg-white px-2">
        {openViews.map((v) => (
          <div key={v.id} className="flex items-center">
            <button
              onClick={() => onViewChange(v.id)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeViewId === v.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {v.label}
            </button>
            {openViews.length > 1 && (
              <button
                onClick={() => onCloseView(v.id)}
                className="-ml-2 mr-1 flex h-5 w-5 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                aria-label="Закрыть вкладку"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {ADDABLE_VIEWS.map((v) => (
              <DropdownMenuItem key={v.type} onClick={() => onAddView(v.type)}>
                {v.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
