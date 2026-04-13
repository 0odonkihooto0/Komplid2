'use client';

import type { ElementType } from 'react';
import {
  Search, PencilLine, Filter, Maximize2, Columns3, Pencil, ChevronDown,
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

interface Props {
  versionId: string | null;
  onEditVersion: () => void;
}

function IconBtn({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GanttScheduleToolbar({ versionId, onEditVersion }: Props) {
  const disabled = !versionId;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        <IconBtn icon={Search} label="Поиск" />
        <IconBtn icon={PencilLine} label="Множественное редактирование" />
        <IconBtn icon={Filter} label="Изолировать отмеченные" />
        <IconBtn icon={Maximize2} label="Полноэкранный режим" />
        <IconBtn icon={Columns3} label="Настроить колонки" />

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
