'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type EstimateChapterDetail, useEstimateTree, type AddItemInput } from '@/hooks/useEstimateTree';
import { EstimateItemRow } from './EstimateItemRow';

const formatRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

interface Props {
  chapter: EstimateChapterDetail;
  projectId: string;
  contractId: string;
  versionId: string;
  readOnly: boolean;
  search: string;
}

/** Один раздел (глава) сметы с позициями и дочерними разделами */
export function EstimateChapterSection({ chapter, projectId, contractId, versionId, readOnly, search }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(chapter.name);
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState<AddItemInput>({ name: '', unit: '', volume: undefined, unitPrice: undefined });

  const { renameChapter, deleteChapter, addItem } = useEstimateTree({ projectId, contractId, versionId });

  // Сохранить переименование раздела
  const handleRename = async () => {
    const name = newName.trim();
    if (!name || name === chapter.name) { setRenaming(false); return; }
    await renameChapter.mutateAsync({ chapterId: chapter.id, name });
    setRenaming(false);
  };

  // Сохранить новую позицию
  const handleAddItem = async () => {
    if (!itemForm.name.trim()) return;
    await addItem.mutateAsync({ chapterId: chapter.id, data: itemForm });
    setItemForm({ name: '', unit: '', volume: undefined, unitPrice: undefined });
    setAddingItem(false);
  };

  // Фильтрация позиций по поисковому запросу
  const filteredItems = search
    ? chapter.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.code ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : chapter.items;

  const hasContent = filteredItems.length > 0 || chapter.children.length > 0;
  const indent = chapter.level > 1 ? 'pl-6' : '';

  return (
    <div className={`border-b last:border-0 ${indent}`}>
      {/* Шапка раздела */}
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
        <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {renaming ? (
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => void handleRename()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRename();
              if (e.key === 'Escape') { setRenaming(false); setNewName(chapter.name); }
            }}
            className="h-7 text-sm font-medium flex-1"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold">
            {chapter.code ? `${chapter.code}. ` : ''}{chapter.name}
          </span>
        )}

        <span className="ml-auto text-sm tabular-nums text-muted-foreground pr-2">
          {formatRub(chapter.totalAmount)}
        </span>

        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}>Переименовать</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddingItem(true)}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Добавить позицию
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Удалить раздел «${chapter.name}» со всеми позициями?`))
                    deleteChapter.mutate(chapter.id);
                }}
              >
                Удалить раздел
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Содержимое раздела */}
      {expanded && (
        <>
          {hasContent && (
            /* Заголовок таблицы */
            <div className="grid grid-cols-[2rem_1fr_5rem_6rem_7rem_7rem_6rem_6rem] gap-1 px-3 py-1 text-xs text-muted-foreground border-b bg-background">
              <span>№</span>
              <span>Наименование</span>
              <span>Ед.</span>
              <span className="text-right">Объём</span>
              <span className="text-right">Цена/ед.</span>
              <span className="text-right">Итого</span>
              <span className="text-right">Труд</span>
              <span className="text-right">Мат.</span>
            </div>
          )}

          {/* Позиции раздела */}
          {filteredItems.map((item, idx) => (
            <EstimateItemRow
              key={item.id}
              item={item}
              index={idx + 1}
              projectId={projectId}
              contractId={contractId}
              versionId={versionId}
              readOnly={readOnly}
              search={search}
            />
          ))}

          {/* Дочерние разделы */}
          {chapter.children.map((child) => (
            <EstimateChapterSection
              key={child.id}
              chapter={child}
              projectId={projectId}
              contractId={contractId}
              versionId={versionId}
              readOnly={readOnly}
              search={search}
            />
          ))}

          {/* Инлайн-форма добавления позиции */}
          {addingItem && (
            <div className="grid grid-cols-[1fr_5rem_6rem_7rem_auto] gap-2 px-3 py-2 border-t bg-background items-center">
              <Input
                autoFocus
                placeholder="Наименование позиции..."
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                className="h-7 text-sm"
              />
              <Input
                placeholder="Ед."
                value={itemForm.unit ?? ''}
                onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                className="h-7 text-sm"
              />
              <Input
                type="number"
                placeholder="Объём"
                value={itemForm.volume ?? ''}
                onChange={(e) => setItemForm((f) => ({ ...f, volume: e.target.value ? Number(e.target.value) : undefined }))}
                className="h-7 text-sm text-right"
              />
              <Input
                type="number"
                placeholder="Цена/ед."
                value={itemForm.unitPrice ?? ''}
                onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value ? Number(e.target.value) : undefined }))}
                className="h-7 text-sm text-right"
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-7" onClick={() => void handleAddItem()} disabled={addItem.isPending}>
                  Добавить
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setAddingItem(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {/* Кнопка добавления позиции */}
          {!readOnly && !addingItem && (
            <button
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 w-full"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Добавить позицию
            </button>
          )}
        </>
      )}
    </div>
  );
}
