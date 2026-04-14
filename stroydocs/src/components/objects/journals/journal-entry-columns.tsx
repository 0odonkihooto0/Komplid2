'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  FileText,
  Info,
  Pencil,
  Copy,
  Trash2,
  Link,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SpecialJournalType } from '@prisma/client';
import { ENTRY_STATUS_LABELS, ENTRY_STATUS_CLASS, type JournalEntryItem } from './journal-constants';

export interface EntryColumnCallbacks {
  objectId: string;
  journalId: string;
  journalType: SpecialJournalType | undefined;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateLink: (entry: JournalEntryItem) => void;
  onCreateExecDoc: (entry: JournalEntryItem) => void;
  onInfo: (entry: JournalEntryItem) => void;
  onEdit: (entry: JournalEntryItem) => void;
  onRemarks: (entry: JournalEntryItem) => void;
  onDuplicate: (entry: JournalEntryItem) => void;
  onDelete: (entry: JournalEntryItem) => void;
  allEntries: JournalEntryItem[];
}

export function makeEntryColumns(cb: EntryColumnCallbacks): ColumnDef<JournalEntryItem>[] {
  const { selectedIds, onSelectionChange, allEntries } = cb;

  const allSelected = allEntries.length > 0 && allEntries.every((e) => selectedIds.includes(e.id));
  const someSelected = allEntries.some((e) => selectedIds.includes(e.id)) && !allSelected;

  return [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allSelected}
          data-state={someSelected ? 'indeterminate' : undefined}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectionChange(allEntries.map((e) => e.id));
            } else {
              onSelectionChange([]);
            }
          }}
          aria-label="Выбрать все"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectionChange([...selectedIds, row.original.id]);
            } else {
              onSelectionChange(selectedIds.filter((id) => id !== row.original.id));
            }
          }}
          aria-label="Выбрать запись"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: 'entryNumber',
      header: '№',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.entryNumber}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Дата',
      cell: ({ row }) => (
        <span className="text-sm">
          {format(new Date(row.original.date), 'd MMM yyyy', { locale: ru })}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Описание',
      cell: ({ row }) => {
        const hasLinks =
          row.original._count.sourceLinks + row.original._count.targetLinks > 0;
        const hasAttachments = row.original.attachmentS3Keys.length > 0;
        return (
          <span className="inline-flex items-center gap-1 text-sm line-clamp-2 max-w-xs">
            {hasLinks && (
              <Link2
                className="h-3.5 w-3.5 shrink-0 text-blue-500"
                aria-label="Есть связанные записи"
              />
            )}
            {hasAttachments && (
              <span
                className="h-3.5 w-3.5 shrink-0 text-xs font-medium text-green-600"
                aria-label="Есть вложения"
                title={`Вложений: ${row.original.attachmentS3Keys.length}`}
              >
                {row.original.attachmentS3Keys.length}
              </span>
            )}
            {row.original.description}
          </span>
        );
      },
    },
    {
      accessorKey: 'location',
      header: 'Место',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.location ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_STATUS_CLASS[s]}`}
          >
            {ENTRY_STATUS_LABELS[s]}
          </span>
        );
      },
    },
    {
      id: 'author',
      header: 'Автор',
      cell: ({ row }) => {
        const a = row.original.author;
        return (
          <span className="text-sm text-muted-foreground">
            {[a.lastName, a.firstName].filter(Boolean).join(' ') || '—'}
          </span>
        );
      },
    },
    {
      id: 'remarks',
      header: 'Замечания',
      cell: ({ row }) => {
        const count = row.original._count.remarks;
        if (count === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-sm text-amber-700">
            <MessageSquare className="h-3.5 w-3.5" />
            {count}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const entry = row.original;
        const isOzr = cb.journalType === 'OZR_1026PR';
        const entryUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/objects/${cb.objectId}/journals/${cb.journalId}/${entry.id}`;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
                aria-label="Действия с записью"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Информация */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onInfo(entry);
                }}
              >
                <Info className="mr-2 h-4 w-4" />
                Информация
              </DropdownMenuItem>

              {/* Редактировать */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onEdit(entry);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </DropdownMenuItem>

              {/* Замечания */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onRemarks(entry);
                }}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Замечания
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Добавить связь */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onCreateLink(entry);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить связь → ЖВК
              </DropdownMenuItem>

              {/* Создать АОСР (только OZR) */}
              {isOzr && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.stopPropagation();
                    cb.onCreateExecDoc(entry);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Создать АОСР
                </DropdownMenuItem>
              )}

              {/* Дублировать */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onDuplicate(entry);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Дублировать
              </DropdownMenuItem>

              {/* Скопировать ссылку */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard.writeText(entryUrl);
                }}
              >
                <Link className="mr-2 h-4 w-4" />
                Скопировать ссылку
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Удалить */}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => {
                  e.stopPropagation();
                  cb.onDelete(entry);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
