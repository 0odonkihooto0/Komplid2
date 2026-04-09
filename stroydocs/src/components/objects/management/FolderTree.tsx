'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { useFolderMutations, type ProjectFolder } from './useProjectDocuments';

interface FolderTreeProps {
  projectId: string;
  folders: ProjectFolder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}

export function FolderTree({ projectId, folders, selectedFolderId, onSelect }: FolderTreeProps) {
  const { createFolder } = useFolderMutations(projectId);
  const [addRootOpen, setAddRootOpen] = useState(false);
  const [newRootName, setNewRootName] = useState('');

  function handleAddRoot() {
    if (!newRootName.trim()) return;
    createFolder.mutate(
      { name: newRootName.trim() },
      {
        onSuccess: () => {
          setNewRootName('');
          setAddRootOpen(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Папки
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              projectId={projectId}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}

          {folders.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Нет папок
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
          Добавить папку
        </Button>
      </div>

      {/* Диалог создания корневой папки */}
      <Dialog open={addRootOpen} onOpenChange={setAddRootOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая папка</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Название папки"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddRootOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleAddRoot} disabled={createFolder.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Рекурсивный узел папки
// ─────────────────────────────────────────────

interface FolderNodeProps {
  folder: ProjectFolder;
  depth: number;
  projectId: string;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}

function FolderNode({ folder, depth, projectId, selectedFolderId, onSelect }: FolderNodeProps) {
  const { createFolder, renameFolder, deleteFolder } = useFolderMutations(projectId);
  const [expanded, setExpanded] = useState(depth === 0);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [childName, setChildName] = useState('');
  const [renameName, setRenameName] = useState(folder.name);

  const hasChildren = folder.children.length > 0;
  const isSelected = folder.id === selectedFolderId;
  const docCount = folder._count?.documents ?? 0;

  function handleAddChild() {
    if (!childName.trim()) return;
    createFolder.mutate(
      { name: childName.trim(), parentId: folder.id },
      {
        onSuccess: () => {
          setChildName('');
          setAddChildOpen(false);
          setExpanded(true);
        },
      },
    );
  }

  function handleRename() {
    if (!renameName.trim() || renameName === folder.name) {
      setRenameOpen(false);
      return;
    }
    renameFolder.mutate(
      { folderId: folder.id, name: renameName.trim() },
      { onSuccess: () => setRenameOpen(false) },
    );
  }

  function handleDelete() {
    if (!window.confirm(`Удалить папку «${folder.name}» и все документы внутри?`)) return;
    deleteFolder.mutate(folder.id);
  }

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-muted/60 ${
          isSelected ? 'bg-muted font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(folder.id)}
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
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </button>

        {/* Иконка папки */}
        {expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
        )}

        {/* Название */}
        <span className="min-w-0 flex-1 truncate">{folder.name}</span>

        {/* Счётчик файлов */}
        {docCount > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {docCount}
          </span>
        )}

        {/* Контекстное меню */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="invisible ml-0.5 shrink-0 rounded p-0.5 hover:bg-accent group-hover:visible"
              onClick={(e) => e.stopPropagation()}
              aria-label="Действия с папкой"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-44">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setAddChildOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Подпапка
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenameName(folder.name);
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

      {/* Дочерние папки */}
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              projectId={projectId}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Диалог добавления подпапки */}
      <Dialog open={addChildOpen} onOpenChange={setAddChildOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая подпапка в «{folder.name}»</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Название подпапки"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddChildOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleAddChild} disabled={createFolder.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог переименования */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать папку</DialogTitle>
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
            <Button size="sm" onClick={handleRename} disabled={renameFolder.isPending}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
