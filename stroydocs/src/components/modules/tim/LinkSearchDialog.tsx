'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export interface SearchDialogItem {
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  items: SearchDialogItem[];
  isLoading: boolean;
  search: string;
  onSearchChange: (s: string) => void;
  onConfirm: (selectedIds: string[]) => void;
  isPending: boolean;
  /** ID сущностей уже привязанных к элементу (для отображения состояния) */
  alreadyLinkedIds?: string[];
}

export function LinkSearchDialog({
  open,
  onOpenChange,
  title,
  items,
  isLoading,
  search,
  onSearchChange,
  onConfirm,
  isPending,
  alreadyLinkedIds = [],
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Сброс выбора при закрытии диалога
  useEffect(() => {
    if (!open) setSelected(new Set());
  }, [open]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            className="h-9 pl-8 text-sm"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Список */}
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="space-y-2 px-1">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {search ? 'Ничего не найдено' : 'Список пуст'}
            </p>
          ) : (
            <div className="space-y-1 px-1">
              {items.map(item => {
                const linked = alreadyLinkedIds.includes(item.id);
                const checked = selected.has(item.id) || linked;
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${linked ? 'opacity-60' : ''}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={linked}
                      onCheckedChange={() => !linked && toggle(item.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                    {item.status && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.status}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={selected.size === 0 || isPending}
          >
            {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Добавить {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
