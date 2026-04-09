'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;
const MAX_VISIBLE_COLS = 8;

interface Props {
  headers: string[];
  rows: string[][];
  onConfirm: (selectedIndices: number[] | null) => void;
  onBack: () => void;
}

/**
 * Таблица сырых строк Excel для выбора перед AI-обработкой.
 * Пагинация по 50 строк. До 8 колонок видно без горизонтального скролла.
 * null = все строки выбраны (по умолчанию, экономичнее передавать null).
 */
export function EstimateRowSelectionStep({ headers, rows, onConfirm, onBack }: Props) {
  // null = все выбраны, number[] = конкретные индексы
  const [selectedIndices, setSelectedIndices] = useState<Set<number> | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visibleCols = headers.slice(0, MAX_VISIBLE_COLS);

  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [rows, page]
  );

  const isAllSelected = selectedIndices === null;
  const selectedCount = isAllSelected ? rows.length : selectedIndices.size;

  function toggleRow(globalIndex: number) {
    if (isAllSelected) {
      // Переходим к явному выбору: все кроме этой
      const newSet = new Set(rows.map((_, i) => i));
      newSet.delete(globalIndex);
      setSelectedIndices(newSet);
    } else {
      const newSet = new Set(selectedIndices);
      if (newSet.has(globalIndex)) {
        newSet.delete(globalIndex);
      } else {
        newSet.add(globalIndex);
      }
      // Если выбрали все — возвращаем null
      setSelectedIndices(newSet.size === rows.length ? null : newSet);
    }
  }

  function selectAll() {
    setSelectedIndices(null);
  }

  function deselectAll() {
    setSelectedIndices(new Set());
  }

  function handleConfirm() {
    if (isAllSelected) {
      onConfirm(null);
    } else {
      onConfirm(Array.from(selectedIndices).sort((a, b) => a - b));
    }
  }

  function isRowSelected(globalIndex: number) {
    return isAllSelected || selectedIndices.has(globalIndex);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm font-normal">
            Выбрано {selectedCount} из {rows.length} строк
          </Badge>
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={isAllSelected}>
            Выбрать все
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll} disabled={!isAllSelected && selectedIndices.size === 0}>
            Сбросить
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Отображены первые {MAX_VISIBLE_COLS} из {headers.length} колонок
        </p>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => (checked ? selectAll() : deselectAll())}
                />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">
                №
              </th>
              {visibleCols.map((col, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground max-w-[200px]">
                  <span className="line-clamp-1">{col || `Кол ${i + 1}`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, pageRowIndex) => {
              const globalIndex = page * PAGE_SIZE + pageRowIndex;
              const selected = isRowSelected(globalIndex);
              return (
                <tr
                  key={globalIndex}
                  className={selected ? 'bg-primary/5' : 'hover:bg-muted/30 opacity-50'}
                  onClick={() => toggleRow(globalIndex)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleRow(globalIndex)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {globalIndex + 1}
                  </td>
                  {visibleCols.map((_, colIndex) => (
                    <td key={colIndex} className="px-3 py-1.5 max-w-[200px]">
                      <span className="line-clamp-1 text-xs">{row[colIndex] || ''}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={onBack}>
          Назад
        </Button>
        <Button onClick={handleConfirm} disabled={selectedCount === 0}>
          Обработать {selectedCount} строк
        </Button>
      </div>
    </div>
  );
}
