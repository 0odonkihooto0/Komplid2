'use client';

import { useState, useEffect } from 'react';
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TaskRoleType } from './useGlobalTasks';

interface ChecklistItem { id: string; title: string; done: boolean; order: number }

function SortableItem({
  item, canEdit, onToggle, onDelete,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50', isDragging && 'opacity-50')}
    >
      {canEdit && (
        <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => onToggle(!item.done)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          item.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300',
        )}
      >
        {item.done && <Check className="h-3 w-3" />}
      </button>
      <span className={cn('flex-1 text-sm', item.done && 'line-through text-gray-400')}>
        {item.title}
      </span>
      {canEdit && (
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface Props {
  items: ChecklistItem[];
  currentUserRole: TaskRoleType | null;
  onToggle: (itemId: string, done: boolean) => void;
  onAdd: (title: string) => void;
  onDelete: (itemId: string) => void;
  onReorder: (items: Array<{ id: string; order: number }>) => void;
}

export function TaskChecklistTab({ items, currentUserRole, onToggle, onAdd, onDelete, onReorder }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => { setLocalItems(items); }, [items]);

  const canEdit = currentUserRole !== null;
  const doneCount = localItems.filter((i) => i.done).length;
  const total = localItems.length;
  const progressPct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localItems.findIndex((i) => i.id === active.id);
    const newIdx = localItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(localItems, oldIdx, newIdx);
    setLocalItems(reordered);
    onReorder(reordered.map((item, idx) => ({ id: item.id, order: idx })));
  }

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    onAdd(title);
    setNewTitle('');
    setShowForm(false);
  }

  return (
    <div className="p-4">
      {/* Прогресс */}
      {total > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{doneCount}/{total} выполнено</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Список */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {localItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              canEdit={canEdit}
              onToggle={(done) => onToggle(item.id, done)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {total === 0 && !showForm && (
        <p className="py-4 text-center text-sm text-gray-400">Пунктов нет</p>
      )}

      {/* Форма добавления */}
      {showForm ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false); }}
            placeholder="Название пункта..."
            className="h-8 flex-1 text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>Добавить</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
        </div>
      ) : canEdit && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-4 w-4" /> Добавить пункт
        </button>
      )}
    </div>
  );
}
