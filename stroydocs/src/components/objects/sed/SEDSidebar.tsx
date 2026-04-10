'use client';

import { useState, useCallback } from 'react';
import type { ReactNode, DragEvent } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  FileText,
  Inbox,
  AlertCircle,
  Users,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useSEDFolders, type SEDFolderItem } from './useSEDFolders';
import type { SEDView } from './useSEDList';

interface SystemViewItem {
  view: SEDView;
  label: string;
  icon: ReactNode;
}

const SYSTEM_VIEWS: SystemViewItem[] = [
  { view: 'all',      label: 'Все документы',    icon: <FileText className="h-4 w-4" /> },
  { view: 'active',   label: 'Активные',         icon: <Inbox className="h-4 w-4" /> },
  { view: 'requires', label: 'Требует действия', icon: <AlertCircle className="h-4 w-4" /> },
  { view: 'my',       label: 'Участвую',         icon: <Users className="h-4 w-4" /> },
  { view: 'sent',     label: 'Отправлены мной',  icon: <Send className="h-4 w-4" /> },
];

interface Props {
  objectId: string;
  selectedView: SEDView;
  selectedFolderId: string | null;
  requiresActionCount: number;
  onViewChange: (view: SEDView) => void;
  onFolderChange: (folderId: string | null) => void;
}

export function SEDSidebar({
  objectId,
  selectedView,
  selectedFolderId,
  requiresActionCount,
  onViewChange,
  onFolderChange,
}: Props) {
  const { folders, createFolder, renameFolder, deleteFolder, moveDocToFolder } =
    useSEDFolders(objectId);

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (name) await createFolder.mutateAsync(name);
    setIsCreating(false);
    setNewFolderName('');
  };

  const handleRenameFolder = async (id: string) => {
    const name = renameValue.trim();
    if (name) await renameFolder.mutateAsync({ id, name });
    setRenamingId(null);
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>, folderId: string) => {
      e.preventDefault();
      setDragOverId(null);
      const docId = e.dataTransfer.getData('text/plain');
      if (docId) moveDocToFolder.mutate({ docId, folderId });
    },
    [moveDocToFolder],
  );

  const deletingFolder = folders.find((f) => f.id === deletingId);
  const isSystemActive = !selectedFolderId;

  return (
    <aside className="w-60 shrink-0 border-r bg-background flex flex-col py-2 overflow-hidden">
      {/* Системные разделы */}
      <div className="px-2 space-y-0.5 mb-2">
        {SYSTEM_VIEWS.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              onFolderChange(null);
              onViewChange(item.view);
            }}
            className={cn(
              'w-full flex items-center gap-2.5 text-left text-sm px-3 py-2 rounded-md transition-colors',
              isSystemActive && selectedView === item.view
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground',
            )}
          >
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            {item.view === 'requires' && requiresActionCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {requiresActionCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div className="border-t mx-2 mb-2" />

      <div className="px-4 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Папки
        </span>
      </div>

      {/* Список папок */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {folders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            selected={selectedFolderId === folder.id}
            isDragOver={dragOverId === folder.id}
            isRenaming={renamingId === folder.id}
            renameValue={renameValue}
            onSelect={() => {
              onFolderChange(folder.id);
              onViewChange('all');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(folder.id);
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => handleDrop(e, folder.id)}
            onRenameStart={() => {
              setRenamingId(folder.id);
              setRenameValue(folder.name);
            }}
            onRenameChange={setRenameValue}
            onRenameConfirm={() => handleRenameFolder(folder.id)}
            onDeleteRequest={() => setDeletingId(folder.id)}
          />
        ))}

        {/* Создать папку */}
        {isCreating ? (
          <div className="px-3 py-1">
            <Input
              autoFocus
              className="h-7 text-sm"
              value={newFolderName}
              placeholder="Название папки..."
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateFolder();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewFolderName('');
                }
              }}
              onBlur={() => void handleCreateFolder()}
            />
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Создать папку
          </button>
        )}
      </div>

      {/* AlertDialog удаления */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить папку?</AlertDialogTitle>
            <AlertDialogDescription>
              Папка «{deletingFolder?.name}» будет удалена. Документы из папки не удаляются.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) {
                  await deleteFolder.mutateAsync(deletingId);
                  if (selectedFolderId === deletingId) onFolderChange(null);
                  setDeletingId(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

interface FolderRowProps {
  folder: SEDFolderItem;
  selected: boolean;
  isDragOver: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onDeleteRequest: () => void;
}

function FolderRow({
  folder,
  selected,
  isDragOver,
  isRenaming,
  renameValue,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onDeleteRequest,
}: FolderRowProps) {
  if (isRenaming) {
    return (
      <div className="px-3 py-1">
        <Input
          autoFocus
          className="h-7 text-sm"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') onRenameConfirm();
          }}
          onBlur={onRenameConfirm}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm',
        selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
        isDragOver && !selected && 'bg-primary/10 ring-1 ring-primary/40',
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragOver ? (
        <FolderOpen className="h-4 w-4 shrink-0" />
      ) : (
        <Folder className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 truncate">{folder.name}</span>
      {folder._count.documentLinks > 0 && (
        <span
          className={cn(
            'text-xs',
            selected ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {folder._count.documentLinks}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity',
              selected && 'opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart();
            }}
          >
            Переименовать
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest();
            }}
          >
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
