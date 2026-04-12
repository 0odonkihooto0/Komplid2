'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  LayoutList,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { EstimateCategoryNode } from './useEstimateCategories';

// ─── Props ──────────────────────────────────────────────────────────────────

interface EstimateCategoryTreeProps {
  categories: EstimateCategoryNode[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onNavigateContract: () => void;
  onCreateCategory: (payload: { name: string; parentId?: string }) => void;
  onRenameCategory: (payload: { categoryId: string; name: string }) => void;
  onDeleteCategory: (categoryId: string) => void;
  isCreating: boolean;
}

// ─── Компонент дерева ───────────────────────────────────────────────────────

export function EstimateCategoryTree({
  categories,
  selectedCategoryId,
  onSelect,
  onNavigateContract,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  isCreating,
}: EstimateCategoryTreeProps) {
  const [addRootOpen, setAddRootOpen] = useState(false);
  const [newRootName, setNewRootName] = useState('');

  function handleAddRoot() {
    if (!newRootName.trim()) return;
    onCreateCategory({ name: newRootName.trim() });
    setNewRootName('');
    setAddRootOpen(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Категории
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {/* Все категории */}
          <div
            className={`flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-muted/60 ${
              selectedCategoryId === null ? 'bg-muted font-medium' : ''
            }`}
            onClick={() => onSelect(null)}
          >
            <LayoutList className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Все категории</span>
          </div>

          {/* Смета контракта — системная категория-ссылка */}
          <div
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-muted/60"
            onClick={onNavigateContract}
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Смета контракта</span>
          </div>

          {/* Дерево пользовательских категорий */}
          {categories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              depth={0}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onCreateCategory={onCreateCategory}
              onRenameCategory={onRenameCategory}
              onDeleteCategory={onDeleteCategory}
            />
          ))}

          {categories.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Нет категорий
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground"
          onClick={() => setAddRootOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Добавить категорию
        </Button>
      </div>

      <Dialog open={addRootOpen} onOpenChange={setAddRootOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая категория</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Название категории"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddRootOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleAddRoot} disabled={isCreating}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Рекурсивный узел категории ─────────────────────────────────────────────

interface CategoryNodeProps {
  category: EstimateCategoryNode;
  depth: number;
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onCreateCategory: (payload: { name: string; parentId?: string }) => void;
  onRenameCategory: (payload: { categoryId: string; name: string }) => void;
  onDeleteCategory: (categoryId: string) => void;
}

function CategoryNode({
  category,
  depth,
  selectedCategoryId,
  onSelect,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState(category.name);

  const hasChildren = category.children.length > 0;
  const isSelected = category.id === selectedCategoryId;
  const count = category._count.versions;

  function handleRename() {
    if (!renameName.trim() || renameName === category.name) {
      setRenameOpen(false);
      return;
    }
    onRenameCategory({ categoryId: category.id, name: renameName.trim() });
    setRenameOpen(false);
  }

  function handleDelete() {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    onDeleteCategory(category.id);
  }

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-muted/60 ${
          isSelected ? 'bg-muted font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(category.id)}
      >
        {/* Раскрытие/сворачивание */}
        <button
          className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : null}
        </button>

        {/* Иконка папки */}
        {expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-blue-500" />
        )}

        {/* Название */}
        <span className="min-w-0 flex-1 truncate">{category.name}</span>

        {/* Счётчик смет */}
        {count > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] justify-center px-1.5 text-[10px]">
            {count}
          </Badge>
        )}

        {/* Контекстное меню */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="invisible ml-0.5 shrink-0 rounded p-0.5 hover:bg-accent group-hover:visible"
              onClick={(e) => e.stopPropagation()}
              aria-label="Действия с категорией"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenameName(category.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Дочерние категории */}
      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onCreateCategory={onCreateCategory}
              onRenameCategory={onRenameCategory}
              onDeleteCategory={onDeleteCategory}
            />
          ))}
        </div>
      )}

      {/* Диалог переименования */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать категорию</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenameOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleRename}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
