'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/useToast';
import {
  useGanttStages,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
} from './useGanttStructure';
import type { GanttStageItem } from './useGanttStructure';

// ── Сортируемая строка таблицы ─────────────────────────────────────────────

interface RowProps {
  stage: GanttStageItem;
  onEdit: (stage: GanttStageItem) => void;
  onSetCurrent: (stageId: string) => void;
  onDelete: (stage: GanttStageItem) => void;
  isUpdating: boolean;
}

function SortableStageRow({ stage, onEdit, onSetCurrent, onDelete, isUpdating }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      <TableCell>
        <button
          className="font-medium hover:underline text-left"
          onClick={() => onEdit(stage)}
          title="Редактировать название"
        >
          {stage.name}
          <Pencil className="inline ml-1 h-3 w-3 text-muted-foreground opacity-60" />
        </button>
      </TableCell>
      <TableCell>
        {stage.isCurrent && (
          <Badge variant="outline" className="border-green-400 text-green-700">
            ✓ Текущая
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {stage._count.versions}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {!stage.isCurrent && (
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onSetCurrent(stage.id)}
            >
              Сделать текущей
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(stage)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

interface Props {
  objectId: string;
}

export function GanttStagesView({ objectId }: Props) {
  const { toast } = useToast();
  const { stages, isLoading } = useGanttStages(objectId);

  // Локальный порядок стадий для мгновенного отображения DnD
  const [localStages, setLocalStages] = useState<GanttStageItem[]>([]);
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  // Диалог добавления стадии
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  // Диалог редактирования названия
  const [editStage, setEditStage] = useState<GanttStageItem | null>(null);
  const [editName, setEditName] = useState('');

  const createMutation = useCreateStage(objectId);
  const updateMutation = useUpdateStage(objectId);
  const deleteMutation = useDeleteStage(objectId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Обработка окончания перетаскивания — обновляем порядок на сервере
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localStages.findIndex((s) => s.id === active.id);
    const newIndex = localStages.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(localStages, oldIndex, newIndex);
    setLocalStages(reordered);

    // Отправляем обновление порядка для каждой стадии
    try {
      await Promise.all(
        reordered.map((s, i) =>
          updateMutation.mutateAsync({ stageId: s.id, order: i + 1 }),
        ),
      );
    } catch {
      // Ошибка уже показана в хуке через toast
    }
  }

  function handleAddStage() {
    const name = newStageName.trim();
    if (!name) return;
    createMutation.mutate(name, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewStageName('');
      },
    });
  }

  function handleOpenEdit(stage: GanttStageItem) {
    setEditStage(stage);
    setEditName(stage.name);
  }

  function handleSaveEdit() {
    if (!editStage) return;
    const name = editName.trim();
    if (!name || name === editStage.name) {
      setEditStage(null);
      return;
    }
    updateMutation.mutate(
      { stageId: editStage.id, name },
      { onSuccess: () => setEditStage(null) },
    );
  }

  function handleDelete(stage: GanttStageItem) {
    if (stage._count.versions > 0) {
      toast({
        title: 'Нельзя удалить стадию',
        description: `Сначала удалите или перепривяжите ${stage._count.versions} версий ГПР.`,
        variant: 'destructive',
      });
      return;
    }
    deleteMutation.mutate(stage.id);
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Стадии реализации объекта
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить стадию
        </Button>
      </div>

      {/* Таблица стадий */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : localStages.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Стадии не добавлены. Нажмите «Добавить стадию».
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={localStages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Название</TableHead>
                  <TableHead>Текущая</TableHead>
                  <TableHead className="text-center">Версий</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {localStages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onEdit={handleOpenEdit}
                    onSetCurrent={(id) => updateMutation.mutate({ stageId: id, isCurrent: true })}
                    onDelete={handleDelete}
                    isUpdating={updateMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      )}

      {/* Диалог: добавить стадию */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить стадию</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Например: СМР, ПИР, Монтаж…"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleAddStage}
              disabled={!newStageName.trim() || createMutation.isPending}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог: редактировать название */}
      <Dialog open={!!editStage} onOpenChange={(open) => { if (!open) setEditStage(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать стадию</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStage(null)}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
