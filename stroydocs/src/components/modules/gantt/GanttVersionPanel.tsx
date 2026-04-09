'use client';

import { useState } from 'react';
import { Pin, Check, Copy, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useCreateVersion, useUpdateVersion, useDeleteVersion, type GanttVersionItem } from './useGanttVersions';

interface Props {
  projectId: string;
  contractId: string;
  versions: GanttVersionItem[];
  activeVersionId: string | null;
  onVersionChange: (versionId: string) => void;
}

export function GanttVersionPanel({
  projectId,
  contractId,
  versions,
  activeVersionId,
  onVersionChange,
}: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const createVersion = useCreateVersion(projectId, contractId);
  const updateVersion = useUpdateVersion(projectId, contractId);
  const deleteVersion = useDeleteVersion(projectId, contractId);

  const activeVersion = versions.find((v) => v.id === activeVersionId);

  function handleCreate() {
    const name = prompt('Название версии:');
    if (!name?.trim()) return;
    createVersion.mutate({ name: name.trim() }, {
      onSuccess: (v) => onVersionChange(v.id),
    });
  }

  function handleRename(v: GanttVersionItem) {
    const name = prompt('Новое название:', v.name);
    if (!name?.trim() || name === v.name) return;
    updateVersion.mutate({ versionId: v.id, data: { name: name.trim() } });
  }

  function handleCopy(v: GanttVersionItem) {
    const name = prompt('Название копии:', `${v.name} (копия)`);
    if (!name?.trim()) return;
    createVersion.mutate({ name: name.trim(), copyFromVersionId: v.id }, {
      onSuccess: (newV) => onVersionChange(newV.id),
    });
  }

  function handleSetActive(v: GanttVersionItem) {
    updateVersion.mutate({ versionId: v.id, data: { isActive: true } }, {
      onSuccess: () => onVersionChange(v.id),
    });
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {activeVersion ? (
              <span className="max-w-[200px] truncate">
                {activeVersion.isBaseline && <Pin className="mr-1 inline h-3 w-3" />}
                {activeVersion.name}
              </span>
            ) : (
              'Версия графика'
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {versions.map((v) => (
            <DropdownMenuItem
              key={v.id}
              className="flex items-center justify-between pr-1"
              onSelect={() => onVersionChange(v.id)}
            >
              <span className="flex items-center gap-1 truncate">
                {v.isBaseline && <Pin className="h-3 w-3 text-muted-foreground" />}
                {v.isActive && <Check className="h-3 w-3 text-green-600" />}
                <span className="truncate">{v.name}</span>
              </span>
              <span className="flex shrink-0 gap-0.5">
                <Badge variant="secondary" className="text-xs">{v._count.tasks}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Переименовать"
                  onClick={(e) => { e.stopPropagation(); handleRename(v); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Скопировать"
                  onClick={(e) => { e.stopPropagation(); handleCopy(v); }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {!v.isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Установить активной"
                    onClick={(e) => { e.stopPropagation(); handleSetActive(v); }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  aria-label="Удалить"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(v.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Создать версию
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        entityName={versions.find((v) => v.id === deleteId)?.name ?? 'версию'}
        warningText="Все задачи этой версии будут удалены без возможности восстановления."
        isPending={deleteVersion.isPending}
        onConfirm={() => {
          if (deleteId) deleteVersion.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
