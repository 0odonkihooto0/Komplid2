'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Columns, Printer, Trash2, Plus, History } from 'lucide-react';
import type { ReferenceSchema } from '@/lib/references/types';
import type { ReferenceTableState } from './useReferenceTable';

interface Props {
  schema: ReferenceSchema;
  state: ReferenceTableState;
  debouncedSearch: string;
  onSearchChange: (v: string) => void;
  visibleColumnKeys: string[];
  onOpenAudit: () => void;
  onDeleteSelected: () => void;
  onAddNew: () => void;
}

export function ReferenceTableToolbar({
  schema, state, debouncedSearch, onSearchChange,
  visibleColumnKeys, onOpenAudit, onDeleteSelected, onAddNew,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Поиск..."
        value={debouncedSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs h-8"
      />

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-1" />Колонки</Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <SheetHeader><SheetTitle>Колонки таблицы</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {schema.fields.filter((f) => !f.hidden).map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={state.columnVisibility[f.key] !== false}
                  onCheckedChange={() => state.toggleColumnVisibility(f.key)}
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" />Печать</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => state.exportTable('visible', visibleColumnKeys)}>Отображаемые колонки</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.exportTable('all-columns')}>Все доступные колонки</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.exportTable('all-data')}>Все данные</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {schema.auditable !== false && (
        <Button variant="outline" size="sm" onClick={onOpenAudit}>
          <History className="h-4 w-4 mr-1" />История
        </Button>
      )}

      <div className="flex-1" />

      {state.selectedIds.length > 0 && (
        <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
          <Trash2 className="h-4 w-4 mr-1" />Удалить ({state.selectedIds.length})
        </Button>
      )}

      <Button size="sm" onClick={onAddNew}>
        <Plus className="h-4 w-4 mr-1" />Добавить {schema.nameSingular}
      </Button>
    </div>
  );
}
