'use client';

import { Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { JournalEntryStatus, SpecialJournalType } from '@prisma/client';
import { ENTRY_STATUS_LABELS, type JournalEntryItem } from './journal-constants';
import { makeEntryColumns } from './journal-entry-columns';

const STATUS_OPTIONS = Object.keys(ENTRY_STATUS_LABELS) as JournalEntryStatus[];

// === Компонент ===

interface Props {
  entries: JournalEntryItem[];
  isLoading: boolean;
  statusFilter: JournalEntryStatus | '';
  onStatusFilterChange: (v: JournalEntryStatus | '') => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  onRowClick: (entry: JournalEntryItem) => void;
  journalType?: SpecialJournalType;
  objectId: string;
  journalId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateLink: (entry: JournalEntryItem) => void;
  onCreateExecDoc: (entry: JournalEntryItem) => void;
  onBulkDelete: (ids: string[]) => void;
  onDelete: (entry: JournalEntryItem) => void;
  onDuplicate: (entry: JournalEntryItem) => void;
  onEdit: (entry: JournalEntryItem) => void;
  onInfo: (entry: JournalEntryItem) => void;
  onRemarks: (entry: JournalEntryItem) => void;
}

export function JournalEntryList({
  entries,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onResetFilters,
  onRowClick,
  journalType,
  objectId,
  journalId,
  selectedIds,
  onSelectionChange,
  onCreateLink,
  onCreateExecDoc,
  onBulkDelete,
  onDelete,
  onDuplicate,
  onEdit,
  onInfo,
  onRemarks,
}: Props) {
  const columns = makeEntryColumns({
    objectId,
    journalId,
    journalType,
    selectedIds,
    onSelectionChange,
    onCreateLink,
    onCreateExecDoc,
    onInfo,
    onEdit,
    onRemarks,
    onDuplicate,
    onDelete,
    allEntries: entries,
  });

  return (
    <div className="space-y-3">
      {/* Фильтры и панель массового удаления */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Статус записи</Label>
          <Select
            value={statusFilter || 'ALL'}
            onValueChange={(v) =>
              onStatusFilterChange(v === 'ALL' ? '' : (v as JournalEntryStatus))
            }
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ENTRY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 self-end">
            Сбросить
          </Button>
        )}

        {/* Кнопка массового удаления — видна только при выборе записей */}
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-9 self-end ml-auto"
            onClick={() => onBulkDelete(selectedIds)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Удалить выбранные ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Таблица */}
      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Загрузка записей...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {hasFilters
              ? 'Записей по фильтру не найдено'
              : 'Записей пока нет. Добавьте первую запись.'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          searchPlaceholder="Поиск по описанию..."
          searchColumn="description"
          onRowClick={onRowClick}
        />
      )}
    </div>
  );
}
