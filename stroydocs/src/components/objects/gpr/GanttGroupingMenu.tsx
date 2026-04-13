'use client';

import { LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type GroupByField = 'volumeUnit' | 'workType' | 'costType';

const GROUP_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'volumeUnit', label: 'Единицы измерения' },
  { value: 'workType',   label: 'Вид работ (Исполнители)' },
  { value: 'costType',   label: 'Тип стоимости (Коды объектов)' },
];

interface Props {
  value: GroupByField | null;
  onChange: (v: GroupByField | null) => void;
  disabled?: boolean;
}

export function GanttGroupingMenu({ value, onChange, disabled }: Props) {
  const isActive = value !== null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isActive ? 'text-primary bg-primary/10' : ''}`}
              disabled={disabled}
              aria-label="Группировка записей ГПР"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Группировка записей ГПР</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Группировать по
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value ?? ''}
          onValueChange={(v) => onChange(v === '' ? null : (v as GroupByField))}
        >
          <DropdownMenuRadioItem value="" className="text-xs">
            Без группировки
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {GROUP_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
