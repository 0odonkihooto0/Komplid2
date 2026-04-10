'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useFinancialTableDetail } from './useFinancialTables';

/** Описание колонки финансовой таблицы */
interface TableColumn {
  key: string;
  label: string;
}

/** Строка таблицы — произвольный словарь значений */
type TableRow = Record<string, string>;

interface Props {
  projectId: string;
  contractId: string;
  tableId: string;
  onDelete: () => void;
}

/** Задержка перед отправкой PATCH после редактирования ячейки (мс) */
const DEBOUNCE_MS = 800;

export function FinancialTableEditor({ projectId, contractId, tableId, onDelete }: Props) {
  const { table, isLoading, patchMutation, fillFromGprMutation } =
    useFinancialTableDetail(projectId, contractId, tableId);

  const [localColumns, setLocalColumns] = useState<TableColumn[]>([]);
  const [localRows, setLocalRows] = useState<TableRow[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизировать локальное состояние при получении данных с сервера
  useEffect(() => {
    if (!table) return;
    setLocalColumns(table.columns as TableColumn[]);
    setLocalRows(table.rows as TableRow[]);
  }, [table]);

  /** Отправить изменения на сервер с задержкой */
  const schedulePatch = useCallback(
    (columns: TableColumn[], rows: TableRow[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        patchMutation.mutate({ columns, rows });
      }, DEBOUNCE_MS);
    },
    [patchMutation],
  );

  /** Обновить значение ячейки строки при потере фокуса */
  function handleCellBlur(rowIdx: number, key: string, value: string) {
    const newRows = localRows.map((r, i) =>
      i === rowIdx ? { ...r, [key]: value } : r,
    );
    setLocalRows(newRows);
    schedulePatch(localColumns, newRows);
  }

  /** Обновить заголовок колонки при потере фокуса */
  function handleHeaderBlur(key: string, newLabel: string) {
    const newCols = localColumns.map((c) =>
      c.key === key ? { ...c, label: newLabel } : c,
    );
    setLocalColumns(newCols);
    schedulePatch(newCols, localRows);
  }

  /** Добавить новую колонку */
  function addColumn() {
    const key = `col_${Date.now()}`;
    const newCols = [...localColumns, { key, label: 'Новая колонка' }];
    const newRows = localRows.map((r) => ({ ...r, [key]: '' }));
    setLocalColumns(newCols);
    setLocalRows(newRows);
    schedulePatch(newCols, newRows);
  }

  /** Добавить новую строку */
  function addRow() {
    const emptyRow = Object.fromEntries(localColumns.map((c) => [c.key, '']));
    const newRows = [...localRows, emptyRow];
    setLocalRows(newRows);
    schedulePatch(localColumns, newRows);
  }

  if (isLoading || !table) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-3">
      {/* Кнопки управления таблицей */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button size="sm" variant="outline" onClick={addColumn}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Добавить колонку
        </Button>
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Добавить строку
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fillFromGprMutation.mutate()}
          disabled={fillFromGprMutation.isPending}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Перезаполнить из ГПР
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Удалить таблицу"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Индикатор состояния сохранения */}
      {patchMutation.isPending && (
        <p className="text-xs text-muted-foreground text-right">Сохранение...</p>
      )}

      {localColumns.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Нет колонок. Нажмите «Добавить колонку» или «Перезаполнить из ГПР».
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {localColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[120px] outline-none focus:bg-blue-50 dark:focus:bg-blue-950/20"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleHeaderBlur(col.key, e.currentTarget.textContent ?? '')
                    }
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={localColumns.length}
                    className="py-4 text-center text-xs text-muted-foreground"
                  >
                    Нет строк. Нажмите «Добавить строку» или «Перезаполнить из ГПР».
                  </td>
                </tr>
              ) : (
                localRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b last:border-0 hover:bg-muted/30">
                    {localColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-1.5 outline-none focus:bg-blue-50 dark:focus:bg-blue-950/20"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          handleCellBlur(rowIdx, col.key, e.currentTarget.textContent ?? '')
                        }
                      >
                        {row[col.key] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
