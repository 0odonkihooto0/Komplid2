'use client';

import type { ElementType } from 'react';
import {
  Search, CheckSquare, Eye, EyeOff, Maximize2, Columns3, Pencil, ChevronDown, Clock,
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GanttGroupingMenu, type GroupByField } from './GanttGroupingMenu';

interface Props {
  versionId: string | null;
  onEditVersion: () => void;
  // Группировка
  groupBy: GroupByField | null;
  onGroupByChange: (v: GroupByField | null) => void;
  // Режим множественного редактирования
  isMultiSelectActive: boolean;
  onToggleMultiSelect: () => void;
  // Изоляция
  isIsolated: boolean;
  onIsolate: () => void;
  onShowAll: () => void;
  // Журнал изменений
  onOpenChangeLog?: () => void;
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${active ? 'text-primary bg-primary/10' : ''}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GanttScheduleToolbar({
  versionId,
  onEditVersion,
  groupBy,
  onGroupByChange,
  isMultiSelectActive,
  onToggleMultiSelect,
  isIsolated,
  onIsolate,
  onShowAll,
  onOpenChangeLog,
}: Props) {
  const disabled = !versionId;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        <IconBtn icon={Search} label="Поиск" disabled={true} />

        {/* Множественное редактирование */}
        <IconBtn
          icon={CheckSquare}
          label={isMultiSelectActive ? 'Выйти из режима выбора' : 'Множественное редактирование'}
          onClick={onToggleMultiSelect}
          active={isMultiSelectActive}
          disabled={disabled}
        />

        {/* Изоляция / Показать все */}
        {isIsolated ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary bg-primary/10"
                onClick={onShowAll}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Показать все задачи</TooltipContent>
          </Tooltip>
        ) : (
          <IconBtn
            icon={Eye}
            label="Изолировать отмеченные"
            onClick={onIsolate}
            disabled={disabled}
          />
        )}

        {/* Группировка */}
        <GanttGroupingMenu
          value={groupBy}
          onChange={onGroupByChange}
          disabled={disabled}
        />

        <IconBtn icon={Maximize2} label="Полноэкранный режим" disabled={true} />
        <IconBtn icon={Columns3}  label="Настроить колонки"  disabled={true} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEditVersion}
              disabled={disabled}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Редактировать версию</TooltipContent>
        </Tooltip>

        <IconBtn icon={Clock} label="История изменений" onClick={onOpenChangeLog} disabled={disabled} />

        {/* Выпадающее меню «Действия» */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1" disabled={disabled}>
              Действия <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Делегирование</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Делегировать в версию</DropdownMenuItem>
                <DropdownMenuItem disabled>Делегировать и укрупнить</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Пересчёт</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Веса и прогноз</DropdownMenuItem>
                <DropdownMenuItem disabled>Плановые и фактические этапы</DropdownMenuItem>
                <DropdownMenuItem disabled>Перенумеровать</DropdownMenuItem>
                <DropdownMenuItem disabled>Пересчитать суммы</DropdownMenuItem>
                <DropdownMenuItem disabled>Очистить</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Сметы</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Заполнить из смет</DropdownMenuItem>
                <DropdownMenuItem disabled>Обновить загруженные</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Стройконтроль</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Создать недостаток</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Импорт</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>MS Excel</DropdownMenuItem>
                <DropdownMenuItem disabled>Primavera P6</DropdownMenuItem>
                <DropdownMenuItem disabled>MS Project</DropdownMenuItem>
                <DropdownMenuItem disabled>Spider Project</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Экспорт</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Excel</DropdownMenuItem>
                <DropdownMenuItem disabled>Excel с зависимостями</DropdownMenuItem>
                <DropdownMenuItem disabled>PDF</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Календарь версии</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Создать</DropdownMenuItem>
                <DropdownMenuItem disabled>Из шаблона</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
