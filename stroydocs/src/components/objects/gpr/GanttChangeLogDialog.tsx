'use client';

import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import { useGanttChangeLog, type GanttChangeLogEntry } from './useGanttChangeLog';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Наименование',
  planStart: 'Начало плана',
  planEnd: 'Конец плана',
  factStart: 'Начало факта',
  factEnd: 'Конец факта',
  progress: 'Прогресс',
  amount: 'Стоимость',
  volume: 'Объём',
  volumeUnit: 'Единица',
  weight: 'Вес',
  sortOrder: 'Порядок',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  versionId: string;
}

function UserInitials({ user }: { user: GanttChangeLogEntry['user'] }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
      {initials || '?'}
    </div>
  );
}

export function GanttChangeLogDialog({ open, onOpenChange, objectId, versionId }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Дебаунс поиска (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    entries, total, totalPages, page, setPage, filters, setFilters, isLoading,
  } = useGanttChangeLog(objectId, versionId, open);

  // Синхронизация дебаунсированного поиска с фильтрами
  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch, setFilters]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col">
        <SheetHeader>
          <SheetTitle>История изменений{total > 0 ? ` (${total})` : ''}</SheetTitle>
        </SheetHeader>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 py-2">
          <Input
            placeholder="Поиск по задаче..."
            className="h-8 flex-1 min-w-[140px] text-xs"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Input
            type="date"
            className="h-8 w-32 text-xs"
            value={filters.dateFrom}
            onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
          />
          <Input
            type="date"
            className="h-8 w-32 text-xs"
            value={filters.dateTo}
            onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
          />
        </div>

        {/* Список записей */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}

          {!isLoading && entries.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Нет записей об изменениях
            </p>
          )}

          {!isLoading && entries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-2.5 text-xs space-y-1">
              {/* Шапка: действие + дата */}
              <div className="flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100'}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
              </div>

              {/* Задача */}
              {entry.taskName && (
                <p className="text-muted-foreground truncate" title={entry.taskName}>
                  Задача: <span className="text-foreground font-medium">{entry.taskName}</span>
                </p>
              )}

              {/* Изменённое поле */}
              {entry.fieldName && (
                <p className="text-muted-foreground">
                  {FIELD_LABELS[entry.fieldName] ?? entry.fieldName}:{' '}
                  {entry.oldValue !== null && (
                    <span className="line-through text-red-500">{entry.oldValue}</span>
                  )}
                  {entry.oldValue !== null && entry.newValue !== null && ' → '}
                  {entry.newValue !== null && (
                    <span className="text-green-600">{entry.newValue}</span>
                  )}
                </p>
              )}

              {/* Пользователь */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <UserInitials user={entry.user} />
                <span className="text-muted-foreground">
                  {entry.user.lastName} {entry.user.firstName}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Назад
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Далее
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
