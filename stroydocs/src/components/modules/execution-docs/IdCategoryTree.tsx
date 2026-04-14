'use client';

import { useState } from 'react';
import { Plus, AlignJustify, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIdCategories, type IdDocCategoryItem } from './useIdCategories';
import { useToast } from '@/hooks/useToast';

interface Props {
  projectId: string;
  activeId: string | null;
  onSelect: (id: string | null) => void;
}

// Компонент одного узла дерева с кнопками действий
function CategoryNode({
  node,
  activeId,
  onSelect,
  depth,
  projectId,
  onCreateChild,
  onRename,
  onDelete,
}: {
  node: IdDocCategoryItem;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
  projectId: string;
  onCreateChild: (parentId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const isActive = activeId === node.id;
  const hasChildren = node.children.length > 0;
  const docCount = node._count.executionDocs + node._count.ks2Acts;

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          onClick={() => onSelect(node.id)}
          className="flex-1 text-left truncate"
          title={node.name}
        >
          {node.name}
          {docCount > 0 && (
            <span
              className={cn(
                'ml-1.5 text-xs',
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {docCount}
            </span>
          )}
        </button>

        {/* Кнопки действий — видны при наведении */}
        <div className={cn('flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity', isActive && 'opacity-100')}>
          <Button
            size="icon"
            variant="ghost"
            className={cn('h-5 w-5', isActive && 'hover:bg-primary-foreground/20 text-primary-foreground')}
            title="Добавить подкатегорию"
            onClick={(e) => { e.stopPropagation(); onCreateChild(node.id); }}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-5 w-5', isActive && 'hover:bg-primary-foreground/20 text-primary-foreground')}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(node.id, node.name)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(node.id, node.name)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Рекурсивный рендер дочерних узлов */}
      {hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              activeId={activeId}
              onSelect={onSelect}
              depth={depth + 1}
              projectId={projectId}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Компонент инлайн-ввода нового имени категории
function InlineInput({
  placeholder,
  onConfirm,
  onCancel,
  depth = 0,
}: {
  placeholder?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  depth?: number;
}) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim();
      if (trimmed) onConfirm(trimmed);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="px-2 py-1" style={{ paddingLeft: `${8 + depth * 12}px` }}>
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCancel()}
        placeholder={placeholder ?? 'Название категории...'}
        className="h-7 text-sm"
      />
    </div>
  );
}

// Основной компонент дерева категорий ИД
export function IdCategoryTree({ projectId, activeId, onSelect }: Props) {
  const { toast } = useToast();
  const { categories, isLoading, createCategory, renameCategory, deleteCategory, importFromTemplates } =
    useIdCategories(projectId);

  // Состояние инлайн-ввода: null = скрыт, строка = parentId ('' = корень)
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  // Состояние переименования: id → текущее имя
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = (name: string, parentId?: string) => {
    setAddingParentId(null);
    createCategory.mutate(
      { name, parentId: parentId || undefined },
      { onError: (err) => toast({ variant: 'destructive', title: 'Ошибка', description: err.message }) }
    );
  };

  const handleRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameConfirm = (id: string, name: string) => {
    setRenamingId(null);
    if (name === renameValue) return; // без изменений
    renameCategory.mutate(
      { categoryId: id, name },
      { onError: (err) => toast({ variant: 'destructive', title: 'Ошибка', description: err.message }) }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Удалить категорию «${name}»?`)) return;
    deleteCategory.mutate(id, {
      onSuccess: () => {
        if (activeId === id) onSelect(null);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Нельзя удалить', description: err.message }),
    });
  };

  const handleImportTemplates = () => {
    importFromTemplates.mutate(undefined, {
      onSuccess: (data) => {
        if (data.imported === 0) {
          toast({ title: data.message ?? 'Шаблонных категорий нет' });
        } else {
          toast({ title: `Импортировано ${data.imported} категорий` });
        }
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Ошибка импорта', description: err.message }),
    });
  };

  return (
    <aside className="w-56 flex-shrink-0 border-r flex flex-col">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Категории
        </p>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Импортировать шаблоны организации"
            onClick={handleImportTemplates}
            disabled={importFromTemplates.isPending}
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Добавить категорию"
            onClick={() => setAddingParentId('')}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Кнопка «Все документы» */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors',
            activeId === null
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-muted'
          )}
        >
          Все документы
        </button>

        {/* Скелетон при загрузке */}
        {isLoading && (
          <div className="mt-2 space-y-1.5 px-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}

        {/* Инлайн-ввод новой корневой категории */}
        {addingParentId === '' && (
          <InlineInput
            placeholder="Название категории..."
            onConfirm={(name) => handleCreate(name)}
            onCancel={() => setAddingParentId(null)}
          />
        )}

        {/* Дерево категорий */}
        {!isLoading && categories.length === 0 && addingParentId === null && (
          <p className="mt-3 px-2 text-xs text-muted-foreground">
            Нет категорий. Нажмите + чтобы добавить.
          </p>
        )}

        {!isLoading && categories.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {categories.map((cat) => (
              <CategoryNode
                key={cat.id}
                node={cat}
                activeId={renamingId === cat.id ? null : activeId}
                onSelect={onSelect}
                depth={0}
                projectId={projectId}
                onCreateChild={(parentId) => setAddingParentId(parentId)}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}

        {/* Инлайн-ввод дочерней категории */}
        {addingParentId !== null && addingParentId !== '' && (
          <InlineInput
            placeholder="Название подкатегории..."
            onConfirm={(name) => handleCreate(name, addingParentId)}
            onCancel={() => setAddingParentId(null)}
            depth={1}
          />
        )}
      </div>
    </aside>
  );
}
