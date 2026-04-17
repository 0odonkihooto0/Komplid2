'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MoreVertical, Printer, Columns, Trash2, Plus, Link, Info, Pencil, History } from 'lucide-react';
import { useReferenceTable } from './useReferenceTable';
import { ReferenceEditDialog } from './ReferenceEditDialog';
import { ReferenceInfoDialog } from './ReferenceInfoDialog';
import { DeleteReferenceDialog } from './DeleteReferenceDialog';
import { ReferenceAuditPanel } from './ReferenceAuditPanel';
import type { ReferenceSchema } from '@/lib/references/types';
import { toast } from '@/hooks/useToast';

interface Props { schema: ReferenceSchema }

export function ReferenceTable({ schema }: Props) {
  const state = useReferenceTable(schema);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editEntry, setEditEntry] = useState<Record<string, unknown> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [infoEntry, setInfoEntry] = useState<Record<string, unknown> | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => state.setSearch(debouncedSearch), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch, state]);

  const visibleFields = schema.fields.filter(
    (f) => !f.hiddenByDefault || state.columnVisibility[f.key] !== false
  );

  const handleCopyLink = useCallback((id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/references/${schema.slug}/entry/${id}`);
    toast({ title: 'Ссылка скопирована' });
  }, [schema.slug]);

  const totalPages = Math.ceil(state.total / state.pageSize);
  const visibleColumnKeys = visibleFields.map((f) => f.key);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Поиск..."
          value={debouncedSearch}
          onChange={(e) => setDebouncedSearch(e.target.value)}
          className="max-w-xs h-8"
        />

        {/* Колонки */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-1" />Колонки</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader><SheetTitle>Колонки таблицы</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-2">
              {schema.fields.map((f) => (
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

        {/* Экспорт */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" />Печать</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => state.exportTable('visible', visibleColumnKeys)}>
              Отображаемые колонки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => state.exportTable('all-columns')}>
              Все доступные колонки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => state.exportTable('all-data')}>
              Все данные
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {schema.auditable !== false && (
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <History className="h-4 w-4 mr-1" />История
          </Button>
        )}

        <div className="flex-1" />

        {state.selectedIds.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => { setDeleteIds(state.selectedIds); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4 mr-1" />Удалить ({state.selectedIds.length})
          </Button>
        )}

        <Button size="sm" onClick={() => { setEditEntry(null); setEditOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Добавить {schema.nameSingular}
        </Button>
      </div>

      {/* Таблица */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={state.selectedIds.length === state.rows.length && state.rows.length > 0}
                  onCheckedChange={state.toggleAllSelection}
                />
              </TableHead>
              {visibleFields.map((f) => (
                <TableHead key={f.key} className="cursor-pointer select-none" style={f.width ? { width: f.width } : undefined}
                  onClick={() => state.setSorting(f.key, state.sortBy === f.key && state.sortOrder === 'asc' ? 'desc' : 'asc')}>
                  <span className="flex items-center gap-1">
                    {f.label}
                    {state.sortBy === f.key && (state.sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.isLoading ? (
              <TableRow><TableCell colSpan={visibleFields.length + 2} className="h-24 text-center text-muted-foreground">Загрузка...</TableCell></TableRow>
            ) : state.rows.length === 0 ? (
              <TableRow><TableCell colSpan={visibleFields.length + 2} className="h-24 text-center text-muted-foreground">Нет данных</TableCell></TableRow>
            ) : state.rows.map((row) => {
              const id = row.id as string;
              return (
                <TableRow key={id} className="hover:bg-muted/50">
                  <TableCell><Checkbox checked={state.selectedIds.includes(id)} onCheckedChange={() => state.toggleRowSelection(id)} /></TableCell>
                  {visibleFields.map((f) => (
                    <TableCell key={f.key} className="py-2">
                      {f.type === 'boolean' ? (row[f.key] ? 'Да' : 'Нет') :
                       f.type === 'color' ? <span className="inline-block w-5 h-5 rounded border" style={{ background: row[f.key] as string }} /> :
                       f.type === 'select' ? (f.options?.find((o) => o.value === row[f.key])?.label ?? String(row[f.key] ?? '')) :
                       String(row[f.key] ?? '')}
                    </TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setInfoEntry(row); }}><Info className="h-4 w-4 mr-2" />Информация</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditEntry(row); setEditOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Редактировать</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleCopyLink(id)}><Link className="h-4 w-4 mr-2" />Скопировать ссылку</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteIds([id]); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Удалить</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Всего: {state.total}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => state.setPage(state.page - 1)} disabled={state.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
          <Badge variant="outline">{state.page} / {totalPages || 1}</Badge>
          <Button variant="outline" size="sm" onClick={() => state.setPage(state.page + 1)} disabled={state.page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <ReferenceEditDialog schema={schema} entry={editEntry ?? undefined} open={editOpen} onOpenChange={setEditOpen}
        onSuccess={() => { setEditOpen(false); setEditEntry(null); }} queryKey={state.queryKey} />
      {infoEntry && <ReferenceInfoDialog schema={schema} entry={infoEntry} open={!!infoEntry} onOpenChange={(o) => { if (!o) setInfoEntry(null); }}
        onEdit={() => { setEditEntry(infoEntry); setInfoEntry(null); setEditOpen(true); }} />}
      <DeleteReferenceDialog schema={schema} ids={deleteIds} open={deleteOpen} onOpenChange={setDeleteOpen}
        onConfirm={() => { state.bulkDelete(deleteIds); setDeleteOpen(false); }} isPending={state.isDeleting} />
      {schema.auditable !== false && (
        <ReferenceAuditPanel slug={schema.slug} open={auditOpen} onOpenChange={setAuditOpen} />
      )}
    </div>
  );
}
