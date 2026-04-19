'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  MoreVertical, Trash2, Plus, Link, Info, Pencil,
} from 'lucide-react';
import { ReferenceTableToolbar } from './ReferenceTableToolbar';
import { useReferenceTable } from './useReferenceTable';
import { ReferenceEditDialog } from './ReferenceEditDialog';
import { ReferenceInfoDialog } from './ReferenceInfoDialog';
import { DeleteReferenceDialog } from './DeleteReferenceDialog';
import { ReferenceAuditPanel } from './ReferenceAuditPanel';
import type { ReferenceSchema } from '@/lib/references/types';
import { buildTree, flattenVisible, type TreeRow } from '@/lib/references/treeUtils';
import { toast } from '@/hooks/useToast';

interface Props { schema: ReferenceSchema }

// ── Компонент ────────────────────────────────────────────────────

export function ReferenceTable({ schema }: Props) {
  const state = useReferenceTable(schema);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editEntry, setEditEntry] = useState<Record<string, unknown> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createChildDefault, setCreateChildDefault] = useState<Record<string, unknown> | null>(null);
  const [infoEntry, setInfoEntry] = useState<Record<string, unknown> | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => state.setSearch(debouncedSearch), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch, state]);

  // При загрузке иерархического справочника раскрываем корневые узлы
  useEffect(() => {
    if (schema.hierarchical && state.rows.length > 0 && expandedIds.size === 0) {
      const rootIds = state.rows
        .filter((r) => !r[schema.parentKey!])
        .map((r) => r.id as string);
      setExpandedIds(new Set(rootIds));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.hierarchical, state.rows.length]);

  const visibleFields = schema.fields.filter(
    (f) => !f.hidden && (!f.hiddenByDefault || state.columnVisibility[f.key] !== false)
  );

  const handleCopyLink = useCallback((id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/references/${schema.slug}/entry/${id}`);
    toast({ title: 'Ссылка скопирована' });
  }, [schema.slug]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Tree-режим: строим и разворачиваем дерево
  const treeRows = useMemo(() => {
    if (!schema.hierarchical || !schema.parentKey) return null;
    const roots = buildTree(state.rows, schema.parentKey);
    return flattenVisible(roots, expandedIds);
  }, [schema.hierarchical, schema.parentKey, state.rows, expandedIds]);

  const displayRows = treeRows ?? state.rows;

  const totalPages = Math.ceil(state.total / state.pageSize);
  const visibleColumnKeys = visibleFields.map((f) => f.key);

  return (
    <div className="space-y-3">
      <ReferenceTableToolbar
        schema={schema}
        state={state}
        debouncedSearch={debouncedSearch}
        onSearchChange={setDebouncedSearch}
        visibleColumnKeys={visibleColumnKeys}
        onOpenAudit={() => setAuditOpen(true)}
        onDeleteSelected={() => { setDeleteIds(state.selectedIds); setDeleteOpen(true); }}
        onAddNew={() => { setEditEntry(null); setCreateChildDefault(null); setEditOpen(true); }}
      />

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
                <TableHead
                  key={f.key}
                  className={schema.hierarchical ? 'select-none' : 'cursor-pointer select-none'}
                  style={f.width ? { width: f.width } : undefined}
                  onClick={schema.hierarchical ? undefined : () =>
                    state.setSorting(f.key, state.sortBy === f.key && state.sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                >
                  <span className="flex items-center gap-1">
                    {f.label}
                    {!schema.hierarchical && state.sortBy === f.key && (
                      state.sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 2} className="h-24 text-center text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 2} className="h-24 text-center text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : displayRows.map((row) => {
              const id = row.id as string;
              const depth = (row as TreeRow).__depth ?? 0;
              const children = (row as TreeRow).__children ?? [];
              const isExpanded = expandedIds.has(id);

              return (
                <TableRow key={id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={state.selectedIds.includes(id)}
                      onCheckedChange={() => state.toggleRowSelection(id)}
                    />
                  </TableCell>

                  {visibleFields.map((f, fi) => (
                    <TableCell key={f.key} className="py-2">
                      {/* Первая колонка в tree-режиме: отступ + expand/collapse */}
                      {schema.hierarchical && fi === 0 ? (
                        <span className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
                          {children.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(id)}
                              className="text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="inline-block w-4 flex-shrink-0" />
                          )}
                          <span>{String(row[f.key] ?? '')}</span>
                        </span>
                      ) : f.type === 'boolean' ? (row[f.key] ? 'Да' : 'Нет') :
                         f.type === 'color' ? <span className="inline-block w-5 h-5 rounded border" style={{ background: row[f.key] as string }} /> :
                         f.type === 'select' ? (f.options?.find((o) => o.value === row[f.key])?.label ?? String(row[f.key] ?? '')) :
                         String(row[f.key] ?? '')}
                    </TableCell>
                  ))}

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setInfoEntry(row)}>
                          <Info className="h-4 w-4 mr-2" />Информация
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditEntry(row); setCreateChildDefault(null); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" />Редактировать
                        </DropdownMenuItem>
                        {schema.hierarchical && schema.parentKey && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setCreateChildDefault({ [schema.parentKey!]: id, level: depth + 1 });
                              setEditEntry(null);
                              setEditOpen(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />Добавить дочернюю запись
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleCopyLink(id)}>
                          <Link className="h-4 w-4 mr-2" />Скопировать ссылку
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setDeleteIds([id]); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация — только для плоских справочников */}
      {!schema.hierarchical && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Всего: {state.total}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => state.setPage(state.page - 1)} disabled={state.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="outline">{state.page} / {totalPages || 1}</Badge>
            <Button variant="outline" size="sm" onClick={() => state.setPage(state.page + 1)} disabled={state.page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ReferenceEditDialog
        schema={schema}
        entry={editEntry ?? undefined}
        defaultValues={createChildDefault ?? undefined}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => { setEditOpen(false); setEditEntry(null); setCreateChildDefault(null); }}
        queryKey={state.queryKey}
      />
      {infoEntry && (
        <ReferenceInfoDialog
          schema={schema}
          entry={infoEntry}
          open={!!infoEntry}
          onOpenChange={(o) => { if (!o) setInfoEntry(null); }}
          onEdit={() => { setEditEntry(infoEntry); setInfoEntry(null); setEditOpen(true); }}
        />
      )}
      <DeleteReferenceDialog
        schema={schema}
        ids={deleteIds}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => { state.bulkDelete(deleteIds); setDeleteOpen(false); }}
        isPending={state.isDeleting}
      />
      {schema.auditable !== false && (
        <ReferenceAuditPanel slug={schema.slug} open={auditOpen} onOpenChange={setAuditOpen} />
      )}
    </div>
  );
}
