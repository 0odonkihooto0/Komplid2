'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColDef {
  id: string;
  label: string;
}

interface Props {
  columns: ColDef[];
  visibleColumns: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function ColumnSettingsPanel({ columns, visibleColumns, onToggle, onReset }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Колонки
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-3">
        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Отображение</p>
        <div className="space-y-2 mb-3">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <Checkbox
                id={`col-${col.id}`}
                checked={visibleColumns.has(col.id)}
                onCheckedChange={() => onToggle(col.id)}
              />
              <Label
                htmlFor={`col-${col.id}`}
                className="text-sm cursor-pointer font-normal"
              >
                {col.label}
              </Label>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={onReset}
          >
            Сбросить
          </Button>
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Готово
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
