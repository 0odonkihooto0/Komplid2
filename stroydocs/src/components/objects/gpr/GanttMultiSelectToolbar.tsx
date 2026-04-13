'use client';

import {
  ArrowUpRight, Link2, UserCheck, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, MoreHorizontal, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  selectedCount: number;
  onClose: () => void;
  onMove: () => void;
  onMerge: () => void;
  onAssign: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GanttMultiSelectToolbar({
  selectedCount,
  onClose,
  onMove,
  onMerge,
  onAssign,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
}: Props) {
  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-1.5 bg-background border rounded-full shadow-xl">
        {/* Основные действия */}
        <ActionBtn icon={ArrowUpRight} label="Переместить в раздел" onClick={onMove} />
        <ActionBtn icon={Link2}        label="Объединить в сводную задачу" onClick={onMerge} />
        <ActionBtn icon={UserCheck}    label="Назначить ответственного" onClick={onAssign} />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Навигация */}
        <ActionBtn icon={ArrowUp}    label="Сдвинуть выше" onClick={onMoveUp} />
        <ActionBtn icon={ArrowDown}  label="Сдвинуть ниже" onClick={onMoveDown} />
        <ActionBtn icon={ArrowLeft}  label="Повысить уровень" onClick={onMoveLeft} />
        <ActionBtn icon={ArrowRight} label="Понизить уровень" onClick={onMoveRight} />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Доп. действия */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Ещё действия</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" side="top" className="text-xs">
            <DropdownMenuItem onClick={onMove}>Переместить в раздел</DropdownMenuItem>
            <DropdownMenuItem onClick={onMerge}>Объединить</DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>Назначить ответственного</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Счётчик + закрыть */}
        <span className="text-xs text-muted-foreground px-1 whitespace-nowrap">
          Выбрано: {selectedCount}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Выйти из режима выбора</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
