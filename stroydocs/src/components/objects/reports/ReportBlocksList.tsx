'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportBlockItem } from './ReportBlockItem';
import type { ReportBlock, UpdateBlockPayload } from './useReportCard';

interface Props {
  objectId: string;
  reportId: string;
  blocks: ReportBlock[];
  onReorder: (reordered: ReportBlock[]) => void;
  onUpdateBlock: (payload: UpdateBlockPayload) => void;
  onDeleteBlock: (blockId: string) => void;
  editBlockId: string | null;
  setEditBlockId: (id: string | null) => void;
  onAddBlock: () => void;
}

export function ReportBlocksList({
  objectId,
  reportId,
  blocks,
  onReorder,
  onUpdateBlock,
  onDeleteBlock,
  editBlockId,
  setEditBlockId,
  onAddBlock,
}: Props) {
  // Локальный порядок для оптимистичного UI при drag-and-drop
  const [localBlocks, setLocalBlocks] = useState<ReportBlock[]>(blocks);

  // Синхронизация при обновлении данных с сервера
  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localBlocks.findIndex((b) => b.id === active.id);
    const newIndex = localBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Применяем новый порядок с пересчётом поля order
    const reordered = arrayMove(localBlocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      order: i,
    }));
    setLocalBlocks(reordered);
    void onReorder(reordered);
  };

  return (
    <div className="space-y-3">
      {/* ─── Кнопка добавления ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button size="sm" onClick={onAddBlock}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить блок
        </Button>
      </div>

      {/* ─── Пустой стейт ───────────────────────────────────────────────────── */}
      {localBlocks.length === 0 && (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Нет блоков. Нажмите «Добавить блок» для начала.
        </div>
      )}

      {/* ─── Список блоков ──────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localBlocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localBlocks.map((block) => (
              <ReportBlockItem
                key={block.id}
                objectId={objectId}
                reportId={reportId}
                block={block}
                isEditing={editBlockId === block.id}
                onEdit={() => setEditBlockId(block.id)}
                onCancelEdit={() => setEditBlockId(null)}
                onUpdate={onUpdateBlock}
                onDelete={onDeleteBlock}
                onFilled={() => {
                  // Инвалидация кэша происходит в BlockAutoFill через useQueryClient
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
